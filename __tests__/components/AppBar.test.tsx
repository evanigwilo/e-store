import {
  act,
  render,
  screen,
  waitFor,
  fireEvent,
  cleanup,
} from "@testing-library/react";
import SSRProvider from "react-bootstrap/SSRProvider";

import AppBar from "@/components/AppBar";
import Provider from "@/redux/Provider";
import axios from "@/services/axios";
import {
  matchMedia,
  axiosError,
  axiosData,
  authResult,
  categories,
} from "__mocks__/helpers";
import { appTitle } from "utils/constants";

/*
import { cloneElement, ReactElement } from "react";
jest.mock(
  "next/link",
  () =>
    ({ children, ...rest }: { children: ReactElement }) => {
      const _rest = { ...rest } as any;
        delete _rest.passHref;
      return cloneElement(children, _rest);
    }
);
*/

jest.mock("next/router", () => require("next-router-mock"));
// 👉 This is needed for mocking 'next/link':
jest.mock("next/dist/client/router", () => require("next-router-mock"));

describe("AppBar", () => {
  // 👉 Use FakeTimers
  jest.useFakeTimers();

  const axiosGet = axios.get as jest.Mock;
  const axiosPost = axios.post as jest.Mock;

  let firstRun = true;

  beforeAll(() => {
    Object.defineProperty(window, "matchMedia", matchMedia);
  });
  beforeEach(async () => {
    const { currentTestName } = expect.getState();
    const withError = currentTestName.endsWith("(with error)");
    const withAuth = currentTestName.endsWith("(authenticated)");

    axiosGet.mockImplementation((url: string) => {
      switch (url) {
        case "/auth":
          return Promise.resolve(axiosData(withAuth ? authResult : false));
        case "/category":
          return Promise.resolve(axiosData(categories));
        case "/country":
          return Promise.resolve(
            axiosData([
              {
                code: "US",
                name: "United States",
                emoji: "🇺🇸",
              },
              {
                code: "CN",
                name: "China",
                emoji: "🇨🇳",
              },
              {
                code: "JP",
                name: "Japan",
                emoji: "🇯🇵",
              },
            ])
          );
        case "https://ipapi.co/json/":
          return Promise.resolve(axiosData({ country: "US" }));
        default:
          return Promise.resolve();
      }
    });
    axiosPost.mockImplementation((url: string) => {
      switch (url) {
        case "/products":
          return withError
            ? Promise.reject(axiosError({ name: "SearchError" }))
            : Promise.resolve(
                axiosData({
                  queryResult: [
                    {
                      category: "Sports & Outdoors",
                      createdAt: 123,
                      image_1: true,
                      image_2: true,
                      id: "id",
                      price: 100,
                      name: "Roller Skates",
                    },
                  ],
                })
              );
        case "/logout":
          return Promise.resolve();
        default:
          return Promise.resolve();
      }
    });
    await act(async () => {
      render(
        <Provider>
          <SSRProvider>
            <AppBar />
          </SSRProvider>
        </Provider>
      );
    });
    expect(axiosGet).toHaveBeenCalledWith("/auth", undefined);
    // 👉 Redux store does not reset between tests when state is saved
    if (firstRun) {
      firstRun = false;
      expect(axiosGet).toHaveBeenCalledWith("/category");
      expect(axiosGet).toHaveBeenCalledWith("/country");
      expect(axiosGet).toHaveBeenCalledWith("https://ipapi.co/json/", {
        withCredentials: false,
      });
      expect(axiosGet).toHaveBeenCalledTimes(4);
    } else {
      expect(axiosGet).toHaveBeenCalledTimes(1);
    }
    // 👉 post calls
    if (withAuth) {
      expect(axiosPost).toHaveBeenCalledTimes(1);
      expect(axiosPost).toHaveBeenCalledWith("/order/cart", []);
    } else {
      expect(axiosPost).toHaveBeenCalledTimes(0);
    }

    axiosGet.mockClear();
    axiosPost.mockClear();
  });
  afterEach(() => {
    cleanup();
    axiosGet.mockClear();
    axiosPost.mockClear();
  });
  afterAll(() => {
    jest.restoreAllMocks();
  });

  const verifyAppBar = async (authenticated = false) => {
    const appBar = screen.getByRole("navigation");
    const homeImage = screen.getByRole("img", {
      description: (_, element: Element) =>
        Boolean(
          element.attributes.getNamedItem("alt")?.nodeValue === "commerce"
        ),
    });
    const homeLink = screen.getByRole("link", {
      description: (_, element: Element) =>
        Boolean(element.attributes.getNamedItem("href")?.nodeValue === "/"),
    });
    const homeTitle = screen.getByText(appTitle);
    const searchInput = screen.getByPlaceholderText("Search");
    const searchButton = screen.getByRole("button", { name: "Search" });
    const cart = screen.getByText("Cart");
    const cartItems = cart.nextSibling!;
    const toggle = appBar.getElementsByClassName("navbar-toggler-icon")[0];

    fireEvent.click(toggle);

    const deliverTo = await screen.findByRole("button", {
      name: "Deliver to US 🇺🇸",
    });
    const account = screen.getByRole("button", {
      name: authenticated ? "Account (user)" : "Account",
    });
    const orders = screen.getByRole("link", { name: "Orders" });

    // 👉 check controls
    expect(appBar).toBeVisible();
    expect(homeImage).toBeVisible();
    expect(homeLink).toBeVisible();
    expect(homeTitle).toBeVisible();
    expect(searchInput).toBeVisible();
    expect(searchInput).toHaveValue("");
    expect(searchButton).toBeVisible();
    expect(searchButton).toBeEnabled();
    expect(cart).toBeVisible();
    expect(cartItems).toBeVisible();
    expect(cartItems.textContent).toEqual("0");
    expect(toggle).toBeVisible();
    expect(deliverTo).toBeVisible();
    expect(account).toBeVisible();
    expect(orders).toBeVisible();
    expect(orders).toHaveAttribute("href", "/orders");
    expect(screen.getByText("We respect your privacy")).toBeVisible();

    // 👉 countries should be hidden
    const countries = ["🇺🇸 United States", "🇨🇳 China", "🇯🇵 Japan"];
    countries.forEach((country) => {
      expect(screen.queryByRole("button", { name: country })).toBeFalsy();
    });
    // 👉 countries should be visible
    fireEvent.click(deliverTo);
    await waitFor(() => {
      countries.forEach((country) => {
        expect(screen.getByRole("button", { name: country })).toBeVisible();
      });
    });

    // 👉 user options should be hidden
    const userOptions = authenticated
      ? {
          "Sign out": "/",
          "Manage Users": "/users",
          "Manage Products": "/products",
        }
      : { "Sign in": "/login" };

    Object.entries(userOptions).forEach(([name]) => {
      const link = screen.queryByRole("link", { name });
      expect(link).toBeFalsy();
    });
    // 👉 user options should be visible
    fireEvent.click(account);
    await waitFor(() => {
      Object.entries(userOptions).forEach(([name, href]) => {
        const link = screen.queryByRole("link", { name });
        expect(link).toBeVisible();
        expect(link).toHaveAttribute("href", href);
      });
    });
  };
  const searchProduct = async (error = false, searchWithButton = false) => {
    const searchInput = screen.getByPlaceholderText("Search");
    const searchButton = screen.getByRole("button", { name: "Search" });

    // 👉 check controls
    expect(searchInput).toBeVisible();
    expect(searchInput).toHaveValue("");
    expect(searchButton).toBeVisible();
    expect(searchButton).toBeEnabled();

    fireEvent.change(searchInput, {
      target: { value: "product" },
    });
    await waitFor(() => {
      // 👉 advance search product debounce
      jest.advanceTimersByTime(500);
    });

    // 👉 search dialog should be visible
    const searchDialog = screen.getByRole("dialog");
    const findBy = screen.getByRole("button", { name: "All" });
    expect(searchDialog).toBeVisible();
    expect(findBy).toBeVisible();
    expect(findBy).toHaveAttribute("aria-expanded", "false");

    if (error) {
      expect(screen.getByText("SearchError")).toBeVisible();
    } else {
      expect(screen.queryByText("SearchError")).toBeFalsy();
      // 👉 search results should be visible
      expect(screen.getByText("Sports & Outdoors")).toBeVisible();
      expect(screen.getByText("$100.00")).toBeVisible();
      expect(screen.getByText("Roller Skates")).toBeVisible();
      const link =
        searchDialog.getElementsByTagName("td")[0].firstChild?.firstChild!;
      const url = "/category/sports%20&%20outdoors?product=id";

      expect(link).toHaveAttribute("href", url);
      if (!searchWithButton) {
        fireEvent.click(link);
        await waitFor(() => {
          expect(searchDialog).not.toBeVisible();
        });
      }
    }

    // 👉 no get calls
    expect(axiosGet).toHaveBeenCalledTimes(0);

    const searchParams = [
      "/products",
      undefined,
      {
        params: { category: "", limit: 5, search: "product" },
      },
    ];
    if (searchWithButton) {
      // 👉 perform search again
      fireEvent.click(searchButton);
      // 👉 search for product with search button
      await waitFor(() => {
        // 👉 advance search product debounce
        jest.advanceTimersByTime(500);
      });
      // 👉 calls search twice
      expect(axiosPost).toHaveBeenCalledTimes(2);
      for (let i = 0; i < 2; i++) {
        expect(axiosPost.mock.calls[i]).toEqual(searchParams); // 👉 pass
      }
    } else {
      // 👉 calls search
      expect(axiosPost).toHaveBeenCalledTimes(1);
      expect(axiosPost.mock.calls[0]).toEqual(searchParams);
    }
  };

  it("renders components", async () => {
    await verifyAppBar();
    // 👉 no calls
    expect(axiosPost).toHaveBeenCalledTimes(0);
    expect(axiosGet).toHaveBeenCalledTimes(0);
  });
  it("renders components (authenticated)", async () => {
    await verifyAppBar(true);
    // 👉 no calls
    expect(axiosPost).toHaveBeenCalledTimes(0);
    expect(axiosGet).toHaveBeenCalledTimes(0);
  });
  it("should sign user out (authenticated)", async () => {
    await verifyAppBar(true);

    const link = screen.getByRole("link", { name: "Sign out" });
    expect(link).toBeVisible();
    expect(link).toHaveAttribute("href", "/");

    fireEvent.click(link);

    await waitFor(() => {
      // 👉 request calls
      expect(axiosPost).toHaveBeenCalledTimes(1);
      expect(axiosPost).toHaveBeenCalledWith("/logout");
      expect(axiosGet).toHaveBeenCalledTimes(2);
      expect(axiosGet).toHaveBeenCalledWith("/country");
      expect(axiosGet).toHaveBeenCalledWith("https://ipapi.co/json/", {
        withCredentials: false,
      });
    });
  });
  it("should show search bar", async () => {
    const searchInput = screen.getByPlaceholderText("Search");
    const searchButton = screen.getByRole("button", { name: "Search" });
    const noProduct = "No Product Matched.";
    let searchDialog = screen.queryByRole("dialog");
    let findBy = screen.queryByRole("button", { name: "All" });

    expect(screen.queryByText(noProduct)).toBeFalsy();
    // 👉 check controls
    expect(searchInput).toBeVisible();
    expect(searchInput).toHaveValue("");
    expect(searchButton).toBeVisible();
    expect(searchButton).toBeEnabled();
    expect(searchDialog).toBeFalsy();
    expect(findBy).toBeFalsy();

    fireEvent.click(searchInput);
    searchDialog = await screen.findByRole("dialog");
    findBy = screen.getByRole("button", { name: "All" });
    expect(searchDialog).toBeVisible();
    expect(findBy).toBeVisible();
    expect(screen.getByText(noProduct)).toBeVisible();
    // 👉 no calls
    expect(axiosGet).toHaveBeenCalledTimes(0);
    expect(axiosPost).toHaveBeenCalledTimes(0);
  });
  it("should search for product on input change", async () => {
    await searchProduct();
  });
  it("should search for product with button", async () => {
    await searchProduct(false, true);
  });
  it("should search for product on input change (with error)", async () => {
    await searchProduct(true);
  });
});
