import {
  act,
  render,
  screen,
  waitFor,
  fireEvent,
  cleanup,
} from "@testing-library/react";

import numeral from "numeral";

import { LinkProps } from "next/link";
import SSRProvider from "react-bootstrap/SSRProvider";

import axios from "@/services/axios";
import BackDrop from "@/components/BackDrop";
import Provider from "@/redux/Provider";
import Category from "@/pages/category/[category]";
import {
  matchMedia,
  mockProducts,
  mockIntersectionObserver,
  Request,
  axiosData,
  authResult,
  categories,
} from "__mocks__/helpers";

jest.mock(
  "next/link",
  () =>
    ({ children }: React.PropsWithChildren<LinkProps>) =>
      children
);

describe("Category", () => {
  const useRouter = {
    route: "/",
    pathname: "/category/[category]",
    query: { category: "grocery" },
    asPath: "",
    push: jest.fn(),
    events: {
      on: jest.fn(),
      off: jest.fn(),
    },
    beforePopState: jest.fn(() => null),
    prefetch: jest.fn(() => null),
  };
  jest
    .spyOn(require("next/router"), "useRouter")
    .mockImplementation(() => useRouter);

  const axiosGet = axios.get as jest.Mock;

  axiosGet.mockImplementation((url: string) => {
    switch (url) {
      case "/auth":
        return Promise.resolve(authResult);
      case "/category":
        return Promise.resolve(axiosData(categories));
      default:
        return Promise.resolve();
    }
  });

  const fetchMock = jest.spyOn(global, "fetch");

  const expectFetch = () => {
    const request = fetchMock.mock.calls[0][0] as Request;
    expect(request.url).toEqual(
      `${process.env.NEXT_PUBLIC_SERVER_BASE_URL}/v1/products?category=grocery`
    );
    expect(request.credentials).toEqual("same-origin");
    expect(request.method).toEqual("POST");
    expect(request.mode).toEqual(null);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  };

  beforeAll(() => {
    Object.defineProperty(window.Element.prototype, "scrollTo", {
      writable: true,
      value: jest.fn(),
    });
    Object.defineProperty(window, "matchMedia", matchMedia);
    //IntersectionObserver isn't available in test environment;
    window.IntersectionObserver = mockIntersectionObserver();
  });

  beforeEach(async () => {
    fetchMock.mockImplementation(((input: Request) =>
      Promise.resolve({
        status: 200,
        clone: jest.fn().mockReturnValue({
          text: () => Promise.resolve(""),
        } as Partial<Response>),
        text: () => Promise.resolve(JSON.stringify(mockProducts)),
      } as Partial<Response>)) as any);

    await act(async () => {
      render(
        <Provider>
          <SSRProvider>
            <BackDrop>
              <Category />
            </BackDrop>
          </SSRProvider>
        </Provider>
      );
    });
    axiosGet.mockClear();
  });
  afterEach(() => {
    fetchMock.mockClear();
    cleanup();
  });
  afterAll(() => {
    jest.restoreAllMocks();
  });

  it("renders components", async () => {
    const category = screen.getByText("grocery");
    const sortBy = screen.getByText("Sort By -");
    const sortOptions = screen.getByRole("button", {
      name: "Popularity",
    });
    const refresh = screen.getByTitle("Refresh");
    const noProducts = screen.getByText("No more products");
    const appBar = screen.getByRole("navigation");

    // 👉 show controls
    expect(category).toBeVisible();
    expect(sortBy).toBeVisible();
    expect(sortOptions).toHaveAttribute("aria-expanded", "false");
    expect(sortOptions).toBeVisible();
    expect(refresh).toBeVisible();
    expect(noProducts).toBeVisible();
    expect(appBar).toBeVisible();

    // 👉 show products
    const products = screen.getAllByTestId(/^id-/);
    const details = screen.getAllByTitle("Details");
    expect(details).toHaveLength(products.length);

    products.forEach((product, idx) => {
      const { category, name, price, image_1, image_2, image_3 } =
        mockProducts.queryResult[idx];

      // 👉 show product information
      expect(product.innerHTML.includes(`>${category}`)).toBeTruthy();
      expect(product.innerHTML.includes(`>${name}`)).toBeTruthy();
      expect(product.innerHTML.includes(") ratings<")).toBeTruthy();
      expect(product.innerHTML.includes(">Starting from")).toBeTruthy();
      expect(
        product.innerHTML.includes(`>${numeral(price).format("$0,0.00")}<`)
      ).toBeTruthy();
      expect(
        product.innerHTML.includes(
          `> ${numeral(price - price / 4).format("$0,0.00")}<`
        )
      ).toBeTruthy();
      expect(product.getElementsByTagName("button")[0].textContent).toEqual(
        "Add To Cart"
      );
      // 👉 product details should be hidden
      expect(product.lastChild).not.toHaveClass("show");

      // 👉 product images
      const imageCount =
        1 +
        (Boolean(image_1) ? 1 : 0) +
        (Boolean(image_2) ? 1 : 0) +
        (Boolean(image_3) ? 1 : 0);
      expect(product.getElementsByTagName("img")).toHaveLength(imageCount);
    });

    // 👉 requests to the specific routes
    expectFetch();
  });
  it("should show image preview", async () => {
    const image = screen.getByTestId("id-1").getElementsByTagName("img")[0];

    // 👉 preview should be hidden
    expect(screen.queryByRole("dialog")).toBeFalsy();

    fireEvent.click(image);
    // 👉 preview should be visible
    await waitFor(() => {
      const dialog = screen.getByRole("dialog");
      expect(dialog).toBeVisible();
    });

    const close = screen.getByRole("dialog").getElementsByTagName("button")[0];
    fireEvent.click(close);
    // 👉 preview should be hidden
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeFalsy();
    });

    // 👉 requests to the specific routes
    expectFetch();
  });
  it("should show sort options", async () => {
    const sortOptions = screen.getByRole("button", {
      name: "Popularity",
    });
    // 👉 sort options should be hidden
    expect(sortOptions).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(sortOptions);
    // 👉 sort options should be visible showing 'Popularity'
    await waitFor(() => {
      expect(sortOptions).toHaveAttribute("aria-expanded", "true");
    });

    const sortPopularity = screen.getByText((content, element) =>
      Boolean(
        element?.className.includes("dropdown-item") && content === "Popularity"
      )
    );
    const sortLowToHigh = screen.getByText((content, element) =>
      Boolean(
        element?.className.includes("dropdown-item") &&
          content === "Price: Low to High"
      )
    );
    const sortHighToLow = screen.getByText((content, element) =>
      Boolean(
        element?.className.includes("dropdown-item") &&
          content === "Price: High to Low"
      )
    );
    // 👉 sort option 'Popularity' should be selected
    expect(sortPopularity).toHaveAttribute("aria-selected", "true");
    expect(sortLowToHigh).toHaveAttribute("aria-selected", "false");
    expect(sortHighToLow).toHaveAttribute("aria-selected", "false");

    fireEvent.click(sortLowToHigh);
    // 👉 sort option 'Price: Low to High' should be selected
    await waitFor(() => {
      expect(sortOptions).toHaveAttribute("aria-expanded", "false");
      expect(sortOptions.textContent).toEqual("Price: Low to High");
      expect(sortPopularity).toHaveAttribute("aria-selected", "false");
      expect(sortLowToHigh).toHaveAttribute("aria-selected", "true");
    });

    // 👉 requests to the specific routes
    const request = fetchMock.mock.calls as unknown as [input: Request][];
    expect(request[0][0].url).toEqual(
      `${process.env.NEXT_PUBLIC_SERVER_BASE_URL}/v1/products?category=grocery`
    );
    expect(request[1][0].url).toEqual(
      `${process.env.NEXT_PUBLIC_SERVER_BASE_URL}/v1/products?sort=low&category=grocery`
    );
    request.forEach((req) => {
      expect(req[0].credentials).toEqual("same-origin");
      expect(req[0].method).toEqual("POST");
      expect(req[0].mode).toEqual(null);
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it("refresh category", async () => {
    const refresh = screen.getByTitle("Refresh");

    fireEvent.click(refresh);

    await waitFor(() => {
      // 👉 requests to the specific route twice
      const request = fetchMock.mock.calls as unknown as [input: Request][];
      request.forEach((req) => {
        expect(req[0].url).toEqual(
          `${process.env.NEXT_PUBLIC_SERVER_BASE_URL}/v1/products?category=grocery`
        );
        expect(req[0].credentials).toEqual("same-origin");
        expect(req[0].method).toEqual("POST");
        expect(req[0].mode).toEqual(null);
      });
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });
  it("shows product details", async () => {
    const product = screen.getByTestId("id-1");

    // 👉 product details should be hidden
    expect(product.lastChild).not.toHaveClass("show");

    const details = screen.getAllByTitle("Details")[0];

    fireEvent.click(details);

    // 👉 product details should be shown
    await waitFor(() => {
      expect(product.lastChild).toHaveClass("show");
    });

    // 👉 requests to the specific routes
    expectFetch();
  });
  it("shows product categories", async () => {
    const toggle = screen.getByText((_, element) =>
      Boolean(element?.className.includes("bi-list-task"))
    );
    expect(toggle).toBeVisible();

    // 👉 category selection should be hidden
    expect(screen.queryByRole("dialog")).toBeFalsy();

    fireEvent.click(toggle);

    // 👉 category selection should be visible
    await waitFor(() => {
      const dialog = screen.getByRole("dialog");
      expect(dialog).toBeVisible();
    });

    const selected = screen.getByRole("button", {
      name: "Grocery",
    });
    // 👉 category 'Grocery' should be selected
    expect(selected).toHaveAttribute("aria-selected", "true");

    fireEvent.click(selected);
    // 👉 category selection should be hidden
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeFalsy();
    });

    // 👉 requests to the specific routes
    expectFetch();
  });
  it("shows count of cart items", async () => {
    const product = screen.getByTestId("id-1");
    const addToCart = product.getElementsByTagName("button")[0];

    // 👉 AddToCart should be shown
    expect(screen.queryByRole("button", { name: "+" })).toBeFalsy();
    expect(screen.queryByRole("button", { name: "-" })).toBeFalsy();
    expect(addToCart).toBeVisible();

    // 👉 total cart items should be shown in navbar
    const cartCount = screen.getByText("Cart");
    expect(cartCount.nextSibling?.textContent).toEqual("0");

    fireEvent.click(addToCart);

    // 👉 AddToCart should be hidden, total items should be shown
    await waitFor(() => {
      const addButton = screen.getByRole("button", {
        name: "+",
      });
      const removeButton = screen.getByRole("button", {
        name: "-",
      });
      expect(addButton).toBeVisible();
      expect(removeButton).toBeVisible();
      expect(cartCount.nextSibling?.textContent).toEqual("1");
      expect(removeButton.nextSibling?.textContent).toEqual("1");
      expect(addToCart).not.toBeVisible();
    });
  });
});
