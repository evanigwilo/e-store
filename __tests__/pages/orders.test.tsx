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

import BackDrop from "@/components/BackDrop";
import Provider from "@/redux/Provider";
import Orders from "@/pages/orders";
import {
  matchMedia,
  mockOrders,
  mockIntersectionObserver,
  urlParams,
  Request,
} from "__mocks__/helpers";

jest.mock(
  "next/link",
  () =>
    ({ children }: React.PropsWithChildren<LinkProps>) =>
      children
);

describe("Orders", () => {
  const useRouter = {
    route: "/",
    pathname: "/orders",
    query: "",
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

  const fetchMock = jest.spyOn(global, "fetch");

  beforeAll(() => {
    Object.defineProperty(window, "matchMedia", matchMedia);
    //IntersectionObserver isn't available in test environment;
    window.IntersectionObserver = mockIntersectionObserver();
  });

  beforeEach(async () => {
    fetchMock.mockImplementation(((input: Request) => {
      const params = urlParams(input.url);
      return Promise.resolve({
        status: 200,
        clone: jest.fn().mockReturnValue({
          text: () => Promise.resolve(""),
        } as Partial<Response>),
        text: () =>
          Promise.resolve(
            JSON.stringify(
              params.category === "canceled" ? mockOrders() : mockOrders(true)
            )
          ),
      } as Partial<Response>);
    }) as any);

    await act(async () => {
      render(
        <Provider>
          <SSRProvider>
            <BackDrop>
              <Orders />
            </BackDrop>
          </SSRProvider>
        </Provider>
      );
    });
  });
  afterEach(() => {
    fetchMock.mockClear();
    cleanup();
  });
  afterAll(() => {
    jest.restoreAllMocks();
  });

  it("renders components with default to successful orders", async () => {
    const appBar = screen.getByRole("navigation");
    const refresh = screen.getByTitle("Refresh");
    const orderTitle = screen.getByText("Orders (0)");
    const optionAll = screen.getByRole("button", {
      name: "all",
    });
    const optionSucceeded = screen.getByRole("button", {
      name: "succeeded",
    });
    const optionRequested = screen.getByRole("button", {
      name: "requested",
    });
    const optionCanceled = screen.getByRole("button", {
      name: "canceled",
    });
    const order = screen.queryByRole("button", {
      expanded: false,
    });

    // 👉 show order select options
    expect(appBar).toBeVisible();
    expect(refresh).toBeVisible();
    expect(orderTitle).toBeVisible();
    expect(optionAll).toHaveClass("bg-white");
    expect(optionSucceeded).toHaveClass("bg-success");
    expect(optionRequested).toHaveClass("bg-white");
    expect(optionCanceled).toHaveClass("bg-white");
    expect(order).toBeFalsy();

    // 👉 show no order
    expect(screen.getByText("No order")).toBeTruthy();

    // 👉 requests to the specific routes
    const request = fetchMock.mock.calls[0][0] as Request;
    expect(request.url).toEqual(
      `${process.env.NEXT_PUBLIC_SERVER_BASE_URL}/v1/order?category=succeeded`
    );
    expect(request.credentials).toEqual("include");
    expect(request.method).toEqual("POST");
    expect(request.mode).toEqual("cors");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("refresh orders", async () => {
    const refresh = screen.getByTitle("Refresh");

    fireEvent.click(refresh);

    await waitFor(() => {
      // 👉 show no order
      expect(screen.getByText("No order")).toBeTruthy();

      // 👉 requests to the specific route twice
      const request = fetchMock.mock.calls as unknown as [input: Request][];
      request.forEach((req) => {
        expect(req[0].url).toEqual(
          `${process.env.NEXT_PUBLIC_SERVER_BASE_URL}/v1/order?category=succeeded`
        );
        expect(req[0].credentials).toEqual("include");
        expect(req[0].method).toEqual("POST");
        expect(req[0].mode).toEqual("cors");
      });
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });
  it("shows canceled orders", async () => {
    const optionAll = screen.getByRole("button", {
      name: "all",
    });
    const optionSucceeded = screen.getByRole("button", {
      name: "succeeded",
    });
    const optionRequested = screen.getByRole("button", {
      name: "requested",
    });
    const optionCanceled = screen.getByRole("button", {
      name: "canceled",
    });

    // 👉 show order select options
    expect(optionAll).toHaveClass("bg-white");
    expect(optionSucceeded).toHaveClass("bg-success");
    expect(optionRequested).toHaveClass("bg-white");
    expect(optionCanceled).toHaveClass("bg-white");

    fireEvent.click(optionCanceled);

    await waitFor(() => {
      expect(optionAll).toHaveClass("bg-white");
      expect(optionSucceeded).toHaveClass("bg-white");
      expect(optionRequested).toHaveClass("bg-white");
      expect(optionCanceled).toHaveClass("bg-danger");

      const order = screen.getByRole("button", {
        expanded: false,
      });
      expect(order.getElementsByTagName("img")).toHaveLength(1);

      // 👉 show order information
      const orderHtml = order.innerHTML;
      expect(orderHtml.includes(">IPhone")).toBeTruthy();
      expect(orderHtml.includes(">+2 item(s)")).toBeTruthy();
      expect(orderHtml.includes(">Order No: 3120132103")).toBeTruthy();
      expect(orderHtml.includes(">$5,000")).toBeTruthy();
      expect(orderHtml.includes(">On Jan 1, 1970")).toBeTruthy();

      // 👉 order details should be hidden
      const orderCollapse = screen.getByRole("heading", { level: 2 })
        .nextElementSibling!;
      expect(orderCollapse).not.toHaveClass("show");
    });

    // 👉 requests to the specific routes
    const request = fetchMock.mock.calls as unknown as [input: Request][];
    expect(request[0][0].url).toEqual(
      `${process.env.NEXT_PUBLIC_SERVER_BASE_URL}/v1/order?category=succeeded`
    );
    expect(request[1][0].url).toEqual(
      `${process.env.NEXT_PUBLIC_SERVER_BASE_URL}/v1/order?category=canceled`
    );
    request.forEach((req) => {
      expect(req[0].credentials).toEqual("include");
      expect(req[0].method).toEqual("POST");
      expect(req[0].mode).toEqual("cors");
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it("shows order details", async () => {
    const optionCanceled = screen.getByRole("button", {
      name: "canceled",
    });

    // 👉 get order details
    fireEvent.click(optionCanceled);
    const order = await screen.findByRole("button", {
      expanded: false,
    });
    const orderCollapse = screen.getByRole("heading", {
      level: 2,
    }).nextElementSibling!;

    // 👉 order details should be hidden
    expect(orderCollapse).not.toHaveClass("show");

    fireEvent.click(order);

    // 👉 order details should be shown
    await waitFor(() => {
      expect(orderCollapse).toHaveClass("show");
    });
    const orderCollapseHtml = orderCollapse.innerHTML;

    // 👉 show main order image, order details images and payment method image
    expect(orderCollapse.getElementsByTagName("img")).toHaveLength(3);

    // 👉 show order summary details
    expect(orderCollapseHtml.includes(">Summary")).toBeTruthy();
    expect(orderCollapseHtml.includes(">Order No: 3120132103")).toBeTruthy();
    expect(orderCollapseHtml.includes(">Placed on Jan 1, 1970")).toBeTruthy();
    expect(orderCollapseHtml.includes(">2 Item(s)")).toBeTruthy();
    expect(orderCollapseHtml.includes(">Amount: $5,000")).toBeTruthy();

    // 👉 show order product details
    expect(orderCollapseHtml.includes(">Product(s)")).toBeTruthy();
    expect(orderCollapseHtml.includes(">Price")).toBeTruthy();
    expect(orderCollapseHtml.includes(">Quantity")).toBeTruthy();
    expect(orderCollapseHtml.includes(">Qty")).toBeTruthy();

    expect(orderCollapseHtml.includes(">IPhone")).toBeTruthy();
    expect(orderCollapseHtml.includes(">Phone")).toBeTruthy();
    expect(orderCollapseHtml.includes(">$1,000")).toBeTruthy();
    expect(orderCollapseHtml.includes(">1<")).toBeTruthy();

    expect(orderCollapseHtml.includes(">Rice")).toBeTruthy();
    expect(orderCollapseHtml.includes(">Grocery")).toBeTruthy();
    expect(orderCollapseHtml.includes(">$2,000")).toBeTruthy();
    expect(orderCollapseHtml.includes(">2<")).toBeTruthy();

    // 👉 show order payment/delivery details
    expect(orderCollapseHtml.includes(">Payment &amp; Delivery")).toBeTruthy();
    expect(orderCollapseHtml.includes(">Account Name: user")).toBeTruthy();
    expect(orderCollapseHtml.includes(">Payment Method:")).toBeTruthy();
    expect(orderCollapseHtml.includes(">Shipping Fees: $10.00")).toBeTruthy();
    expect(
      orderCollapseHtml.includes(">Delivery Method: Express Delivery")
    ).toBeTruthy();
    expect(
      orderCollapseHtml.includes(">Pick-up Address: JA, Japan")
    ).toBeTruthy();

    // 👉 requests to the specific routes
    const request = fetchMock.mock.calls as unknown as [input: Request][];
    expect(request[0][0].url).toEqual(
      `${process.env.NEXT_PUBLIC_SERVER_BASE_URL}/v1/order?category=succeeded`
    );
    expect(request[1][0].url).toEqual(
      `${process.env.NEXT_PUBLIC_SERVER_BASE_URL}/v1/order?category=canceled`
    );
    request.forEach((req) => {
      expect(req[0].credentials).toEqual("include");
      expect(req[0].method).toEqual("POST");
      expect(req[0].mode).toEqual("cors");
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it("show error when refreshed", async () => {
    fetchMock.mockImplementation(((input: Request) =>
      Promise.resolve({
        status: 403,
        clone: jest.fn().mockReturnValue({
          text: () => Promise.resolve(""),
        } as Partial<Response>),
        text: () => Promise.resolve(JSON.stringify({ message: "Forbidden" })),
      } as Partial<Response>)) as any);

    const refresh = screen.getByTitle("Refresh");

    fireEvent.click(refresh);

    // 👉 show error
    await waitFor(() => {
      expect(
        screen.getByText(
          "Error: You are not authorized to perform this action."
        )
      ).toBeTruthy();

      // 👉 requests to the specific route twice
      const request = fetchMock.mock.calls as unknown as [input: Request][];
      request.forEach((req) => {
        expect(req[0].url).toEqual(
          `${process.env.NEXT_PUBLIC_SERVER_BASE_URL}/v1/order?category=succeeded`
        );
        expect(req[0].credentials).toEqual("include");
        expect(req[0].method).toEqual("POST");
        expect(req[0].mode).toEqual("cors");
      });
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });
});
