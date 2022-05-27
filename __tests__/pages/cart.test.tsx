import {
  act,
  render,
  screen,
  waitFor,
  fireEvent,
  cleanup,
} from "@testing-library/react";

import { LinkProps } from "next/link";
import SSRProvider from "react-bootstrap/SSRProvider";

import axios from "@/services/axios";
import BackDrop from "@/components/BackDrop";
import Provider from "@/redux/Provider";
import Cart from "@/pages/cart";
import {
  matchMedia,
  mockIntersectionObserver,
  axiosData,
  authResult,
  categories,
  axiosError,
} from "__mocks__/helpers";
import { Order } from "utils/types";

jest.mock(
  "next/link",
  () =>
    ({ children }: React.PropsWithChildren<LinkProps>) =>
      children
);
jest.mock("redux-persist/lib/storage", () => ({
  getItem: (key: string) => {
    // 👉 key: 'persist:cart'
    const order = {
      cart: JSON.stringify({
        createdAt: 123,
        status: "IN CART",
        logs: "-",
        orders: [
          {
            slot: 1,
            productId: "productId-1",
            name: "Product-1",
            category: "Grocery",
            price: 500,
            count: 1,
          },
          {
            slot: 2,
            productId: "productId-2",
            name: "Product-2",
            category: "Electronics",
            price: 1000,
            count: 2,
          },
        ],
        amount: 2500,
        user: "user",
        intent: "cart",
      }),
      _persist: '{"version":1,"rehydrated":true}',
    };

    return Promise.resolve(JSON.stringify(order));
  },
  setItem: (key: string, item: string) => Promise.resolve(),
  removeItem: (key: string) => Promise.resolve(),
}));

describe("Cart", () => {
  // 👉 Use FakeTimers
  jest.useFakeTimers();

  const useRouter = {
    route: "/",
    pathname: "/cart",
    query: {},
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
  const axiosPost = axios.post as jest.Mock;

  const mockAxiosPost =
    (empty = false, error = false) =>
    (url: string) => {
      switch (url) {
        case "/order/cart":
          return Promise.resolve(
            axiosData({
              createdAt: 123,
              status: "IN CART",
              logs: "-",
              orders: empty
                ? []
                : [
                    {
                      productId: "productId",
                      slot: 1,
                      name: "Product",
                      category: categories[0],
                      price: 100,
                      count: 1,
                    },
                  ],
              amount: empty ? 0 : 100,
              user: "user",
              intent: "cart",
            } as Partial<Order>)
          );
        case "/order/create":
          return Promise.resolve();
        case "/payment/checkout":
          return error
            ? Promise.reject(axiosError({ name: "InvalidLocationException" }))
            : Promise.resolve(
                axiosData({
                  clientSecret: "clientSecret",
                  amount: 100,
                })
              );
        default:
          return Promise.resolve();
      }
    };

  let firstRun = true;

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
    const { currentTestName } = expect.getState();
    const noCart = currentTestName.endsWith("(no cart items)");
    const authenticated = !currentTestName.endsWith("(redux persist)");
    const withError = currentTestName.endsWith("(with error)");

    axiosPost.mockImplementation(mockAxiosPost(noCart, withError));

    axiosGet.mockImplementation((url: string) => {
      switch (url) {
        case "/auth":
          return Promise.resolve(axiosData(authenticated ? authResult : false));
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

    await act(async () => {
      render(
        <Provider>
          <SSRProvider>
            <BackDrop>
              <Cart />
            </BackDrop>
          </SSRProvider>
        </Provider>
      );
    });

    if (authenticated) {
      expect(axiosPost).toHaveBeenCalledTimes(1);
      expect(axiosPost.mock.calls[0][0]).toEqual("/order/cart");
    }
    expect(axiosGet).toHaveBeenCalledWith("/category");
    expect(axiosGet).toHaveBeenCalledWith("/auth", undefined);

    // 👉 Redux store does not reset between tests when state is saved
    if (firstRun) {
      firstRun = false;
      expect(axiosGet).toHaveBeenCalledWith("/country");
      expect(axiosGet).toHaveBeenCalledWith("https://ipapi.co/json/", {
        withCredentials: false,
      });
      expect(axiosGet).toHaveBeenCalledTimes(4);
    } else {
      expect(axiosGet).toHaveBeenCalledTimes(2);
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

  it("renders components (redux persist)", async () => {
    const subTotal = screen.getByText(
      (_, element) => element?.textContent === "Subtotal: $2,500"
    );
    const title = screen.getByText("Cart (2)");
    const fees = screen.getByText("Delivery fees not included.");
    const empty = screen.getByText("Cart Loaded.");

    // 👉 show controls
    expect(subTotal).toBeVisible();
    expect(title).toBeVisible();
    expect(fees).toBeVisible();
    expect(empty).toBeVisible();

    // 👉 total cart items should be shown in navbar
    const cartCount = screen.getByText("Cart");
    expect(cartCount.nextSibling?.textContent).toEqual("2");

    // 👉 no calls
    expect(axiosPost).toHaveBeenCalledTimes(0);
    expect(axiosGet).toHaveBeenCalledTimes(0);
  });
  it("should decrease cart count (redux persist)", async () => {
    const subTotal = screen.getByText(
      (_, element) => element?.textContent === "Subtotal: $2,500"
    );
    const title = screen.getByText("Cart (2)");
    // 👉 get second item controls
    const remove = screen.getAllByRole("button", { name: "-" })[1];
    const total = remove.nextSibling!;
    const add = screen.getAllByRole("button", { name: "+" })[1];

    // 👉 show controls
    expect(subTotal).toBeVisible();
    expect(title).toBeVisible();
    expect(add).toBeVisible();
    expect(total).toBeVisible();
    expect(total.textContent).toEqual("2");
    expect(remove).toBeVisible();
    expect(remove).toBeEnabled();

    fireEvent.click(remove);
    // 👉 decrease the total by 1
    await waitFor(() => {
      // 👉 advance update cart item debounce
      jest.advanceTimersByTime(250);
      expect(total.textContent).toEqual("1");
      expect(remove).toBeDisabled();
    });

    // 👉 total cart items should be shown in navbar
    const cartCount = screen.getByText("Cart");
    expect(cartCount.nextSibling?.textContent).toEqual("2");

    // 👉 no calls since user is not authenticated
    expect(axiosPost).toHaveBeenCalledTimes(0);
    // 👉 no get calls
    expect(axiosGet).toHaveBeenCalledTimes(0);
  });
  it("should show delete modal (redux persist)", async () => {
    // 👉 delete modal should be hidden
    expect(screen.queryByRole("dialog")).toBeFalsy();

    // 👉 get delete first item from cart
    const deleteCart = screen.getAllByText(
      (_, element) => element?.textContent === "Remove"
    )[0];

    fireEvent.click(deleteCart);
    // 👉 delete modal should be visible
    const deleteDialog = await screen.findByRole("dialog");
    expect(deleteDialog).toBeVisible();

    const understoodDelete = screen.getByRole("button", { name: "Understood" });
    const closeDelete = understoodDelete.previousSibling!;

    expect(closeDelete).toBeVisible();
    expect(closeDelete.textContent).toEqual("Close");
    expect(understoodDelete).toBeVisible();

    fireEvent.click(understoodDelete);
    // 👉 delete modal should be hidden
    await waitFor(() => {
      expect(screen.queryAllByRole("dialog")).toHaveLength(0);
    });
    // 👉 no calls since user is not authenticated
    expect(axiosPost).toHaveBeenCalledTimes(0);
    // 👉 no get calls
    expect(axiosGet).toHaveBeenCalledTimes(0);
  });
  it("renders components (no cart items)", async () => {
    const subTotal = screen.getByText(
      (_, element) => element?.textContent === "Subtotal: $0"
    );
    const title = screen.getByText("Cart (0)");

    // 👉 show controls
    expect(subTotal).toBeVisible();
    expect(title).toBeVisible();

    // 👉 no calls
    expect(axiosPost).toHaveBeenCalledTimes(0);
    expect(axiosGet).toHaveBeenCalledTimes(0);
  });
  it("renders components (with cart items)", async () => {
    const subTotal = screen.getByText(
      (_, element) => element?.textContent === "Subtotal: $100"
    );
    const checkout = screen.getByRole("button", {
      name: "Proceed to checkout",
    });
    const title = screen.getByText("Cart (1)");
    const empty = screen.getByText("Cart Loaded.");
    const appBar = screen.getByRole("navigation");
    const remove = screen.getByRole("button", { name: "-" });
    const total = remove.nextSibling!;
    const add = screen.getByRole("button", { name: "+" });
    const deleteCart = screen.getByText(
      (_, element) => element?.textContent === "Remove"
    );

    // 👉 show controls
    expect(subTotal).toBeVisible();
    expect(checkout).toBeVisible();
    expect(checkout).toBeEnabled();
    expect(title).toBeVisible();
    expect(empty).toBeVisible();
    expect(appBar).toBeVisible();
    expect(add).toBeVisible();
    expect(remove).toBeVisible();
    expect(remove).toBeDisabled();
    expect(total).toBeVisible();
    expect(total.textContent).toEqual("1");
    expect(deleteCart).toBeVisible();

    // 👉 total cart items should be shown in navbar
    const cartCount = screen.getByText("Cart");
    expect(cartCount.nextSibling?.textContent).toEqual("1");

    // 👉 no calls
    expect(axiosPost).toHaveBeenCalledTimes(0);
    expect(axiosGet).toHaveBeenCalledTimes(0);
  });
  it("should increase cart count", async () => {
    const subTotal = screen.getByText(
      (_, element) => element?.textContent === "Subtotal: $100"
    );
    const title = screen.getByText("Cart (1)");
    const remove = screen.getByRole("button", { name: "-" });
    const total = remove.nextSibling!;
    const add = screen.getByRole("button", { name: "+" });

    // 👉 show controls
    expect(subTotal).toBeVisible();
    expect(title).toBeVisible();
    expect(add).toBeVisible();
    expect(total).toBeVisible();
    expect(total.textContent).toEqual("1");
    expect(remove).toBeVisible();
    expect(remove).toBeDisabled();

    fireEvent.click(add);
    // 👉 increase the total by 1
    await waitFor(() => {
      // 👉 advance update cart item debounce
      jest.advanceTimersByTime(250);
      expect(total.textContent).toEqual("2");
      expect(remove).toBeEnabled();
    });

    // 👉 total cart items should be shown in navbar
    const cartCount = screen.getByText("Cart");
    expect(cartCount.nextSibling?.textContent).toEqual("1");

    expect(axiosPost).toHaveBeenCalledTimes(1);
    expect(axiosPost).toHaveBeenCalledWith("/order/create", [
      { count: 2, productId: "productId" },
    ]);
    // 👉 no get calls
    expect(axiosGet).toHaveBeenCalledTimes(0);
  });
  const checkout = async () => {
    // 👉 address input should be hidden
    const form = screen.getByTestId("form-location");
    expect(form).not.toHaveClass("show");

    const checkout = screen.getByRole("button", {
      name: "Proceed to checkout",
    });
    expect(checkout).toBeEnabled();

    fireEvent.click(checkout);

    await waitFor(() => {
      // 👉 address input should be shown
      expect(form).toHaveClass("show");
    });
    const county = screen.getByLabelText("Country");
    const address = screen.getByLabelText("Address");
    const continueButton = screen.getByRole("button", { name: "Continue" });

    // 👉 check address input values
    expect(form).toBeVisible();
    expect(address).toBeVisible();
    expect(address).toHaveValue("");
    expect(county).toBeVisible();
    expect(county.textContent).toEqual("Deliver to US 🇺🇸");
    expect(continueButton).toBeVisible();
    expect(continueButton).not.toBeEnabled();

    fireEvent.change(address, {
      target: { value: "address" },
    });

    await waitFor(() => {
      // 👉 continue button should be enabled
      expect(continueButton).toBeEnabled();
    });

    // 👉 card details should be hidden
    expect(screen.queryByRole("dialog")).toBeFalsy();

    return continueButton;
  };
  it("should show address input", async () => {
    const continueButton = await checkout();

    fireEvent.click(continueButton);
    // 👉 card details should be visible
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeVisible();

    // 👉 check card details controls
    const title = screen.getByText("Card Details");
    const close = title.nextSibling!;
    const pay = screen.getByRole("button", { name: "Pay ($100.00)" });

    expect(title).toBeVisible();
    expect(pay).not.toBeEnabled();
    expect(pay).toBeVisible();
    expect(close).toBeVisible();
    expect(close).toHaveClass("btn-close");

    fireEvent.click(close);
    // 👉 card details should be hidden
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeFalsy();
    });

    // 👉 request calls
    expect(axiosPost).toHaveBeenCalledTimes(2);
    expect(axiosPost).toHaveBeenCalledWith("/order/cart", [
      { count: 1, productId: "productId" },
    ]);
    expect(axiosPost).toHaveBeenCalledWith("/payment/checkout", {
      location: { address: "address", country: "United States" },
    });
    // 👉 call to check if user is signed in
    expect(axiosGet).toHaveBeenCalledTimes(1);
    expect(axiosGet).toHaveBeenCalledWith("/auth", undefined);
  });
  it("should show address input (with error)", async () => {
    const continueButton = await checkout();
    // 👉 error should be hidden
    const errorText = "Please enter a valid delivery country or address.";
    expect(screen.queryByRole(errorText)).toBeFalsy();

    fireEvent.click(continueButton);
    // 👉 card details should be hidden
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeFalsy());

    // 👉 error should be visible
    const error = screen.getByText(errorText);
    expect(error).toBeVisible();

    // 👉 request calls
    expect(axiosPost).toHaveBeenCalledTimes(2);
    expect(axiosPost).toHaveBeenCalledWith("/order/cart", [
      { count: 1, productId: "productId" },
    ]);
    expect(axiosPost).toHaveBeenCalledWith("/payment/checkout", {
      location: { address: "address", country: "United States" },
    });
    // 👉 call to check if user is signed in
    expect(axiosGet).toHaveBeenCalledTimes(1);
    expect(axiosGet).toHaveBeenCalledWith("/auth", undefined);
  });
});
