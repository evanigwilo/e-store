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
import Home from "@/pages/index";
import axios from "@/services/axios";
import {
  matchMedia,
  axiosData,
  categories,
  authResult,
} from "__mocks__/helpers";

jest.mock(
  "next/link",
  () =>
    ({ children }: React.PropsWithChildren<LinkProps>) =>
      children
);

describe("Home", () => {
  jest.useFakeTimers().setSystemTime(new Date("2022-01-01"));

  const useRouter = {
    route: "/",
    pathname: "",
    query: { unauthorized: "" },
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

  const index = [
    {
      username: "user1",
      group: "admin_group",
      status: "CONFIRMED",
      gender: "female",
    },
    {
      username: "user2",
      group: "manage_product_group",
      status: "CONFIRMED",
      gender: "male",
    },
  ];
  let firstRun = true;

  beforeAll(() => {
    Object.defineProperty(window, "matchMedia", matchMedia);
  });
  beforeEach(async () => {
    const { currentTestName } = expect.getState();
    const withError = currentTestName.endsWith("(mock error)");

    axiosGet.mockImplementation((url: string) => {
      switch (url) {
        case "/auth":
          return Promise.resolve(axiosData(withError ? false : authResult));
        case "/category":
          return Promise.resolve(axiosData(categories));
        default:
          return Promise.resolve();
      }
    });
    axiosPost.mockImplementation(() => Promise.resolve());

    await act(async () => {
      render(
        <Provider>
          <SSRProvider>
            <BackDrop>
              <Home />
            </BackDrop>
          </SSRProvider>
        </Provider>
      );
    });

    if (!withError) {
      await act(async () => {
        // 👉 advance toast timers
        jest.advanceTimersByTime(5000);
      });
    }
    // 👉 get calls
    expect(axiosGet).toHaveBeenCalledWith("/auth", undefined);
    expect(axiosGet).toHaveBeenCalledWith("/country");
    if (firstRun) {
      firstRun = false;
      expect(axiosGet).toHaveBeenCalledTimes(3);
      expect(axiosGet).toHaveBeenCalledWith("/category");
    } else {
      expect(axiosGet).toHaveBeenCalledTimes(2);
    }
    // 👉 post calls
    if (withError) {
      expect(axiosPost).toHaveBeenCalledTimes(0);
    } else {
      expect(axiosPost).toHaveBeenCalledTimes(1);
      expect(axiosPost).toHaveBeenCalledWith("/order/cart", []);
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

  const loadHome = () => {
    const carousel = screen.getByText((_, element) =>
      Boolean(element?.className.includes("swiper-wrapper"))
    );
    expect(carousel).toBeVisible();

    categories.forEach((category) => {
      expect(screen.getByText(category)).toBeVisible();
    });
    const images = screen.getAllByRole("img", {
      description: (_, element: Element) =>
        Boolean(
          element.attributes
            .getNamedItem("src")
            ?.nodeValue?.startsWith("/assets/images/category/")
        ),
    });
    expect(images).toHaveLength(categories.length);
    images.forEach((image) => {
      expect(image).toBeVisible();
    });
    expect(screen.getByTitle("Top")).toBeVisible();

    expect(
      screen.getByText("Copyright © 2022 All rights reserved | Developed by")
    ).toBeVisible();
    const developer = screen.getByText("Evan Igwilo");
    expect(developer).toBeVisible();
    expect(developer).toHaveAttribute("href", "https://github.com/evanigwilo");
    expect(developer).toHaveAttribute("target", "_blank");
    expect(developer).toHaveAttribute("rel", "noopener noreferrer");
  };

  it("renders components", async () => {
    loadHome();

    // 👉 no requests
    expect(axiosPost).toHaveBeenCalledTimes(0);
    expect(axiosGet).toHaveBeenCalledTimes(0);
  });
  it("renders components (mock error)", async () => {
    loadHome();

    // 👉 no requests
    expect(axiosGet).toHaveBeenCalledTimes(0);
    expect(axiosPost).toHaveBeenCalledTimes(0);
  });
});
