import {
  act,
  render,
  screen,
  waitFor,
  fireEvent,
  cleanup,
} from "@testing-library/react";
import { GetServerSidePropsContext } from "next";
import SSRProvider from "react-bootstrap/SSRProvider";

import { AxiosRequestConfig } from "axios";
import BackDrop from "@/components/BackDrop";
import Provider from "@/redux/Provider";
import Verify, { getServerSideProps } from "@/pages/verify";
import axios from "@/services/axios";
import {
  matchMedia,
  axiosError,
  axiosData,
  authResult,
} from "__mocks__/helpers";

describe("Verify", () => {
  const useRouter = {
    route: "/",
    pathname: "/verify",
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

  const axiosGet = axios.get as jest.Mock;
  const axiosPost = axios.post as jest.Mock;

  beforeAll(() => {
    Object.defineProperty(window, "matchMedia", matchMedia);
  });
  beforeEach(async () => {
    const { currentTestName } = expect.getState();
    const withError = currentTestName.endsWith("(with error)");

    axiosPost.mockImplementation(
      (url: string, data: undefined, config?: AxiosRequestConfig) => {
        switch (url) {
          case "/verify":
            return withError && config?.params.code === "123456"
              ? Promise.reject(axiosError({ name: "CodeMismatchException" }))
              : Promise.resolve();

          default:
            return Promise.resolve();
        }
      }
    );
    await act(async () => {
      render(
        <Provider>
          <SSRProvider>
            <BackDrop>
              <Verify />
            </BackDrop>
          </SSRProvider>
        </Provider>
      );
    });
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

  const verifySteps = async () => {
    const send = screen.getByRole("button", { name: "Send code (Email)" });
    const form = screen.getByTestId("form-verify");

    // 👉 show controls
    expect(send).toBeVisible();
    expect(send).toBeEnabled();
    // 👉 verify input should be hidden
    expect(form).not.toHaveClass("show");

    fireEvent.click(send);
    await waitFor(() => {
      // 👉 verify input should be shown
      expect(form).toHaveClass("show");
    });
    expect(send.textContent).toEqual("Code sent.");
    expect(send).not.toBeEnabled();

    const codeInput = screen.getByLabelText("Ender Code");
    expect(codeInput).toBeVisible();
    expect(codeInput).toHaveValue(null);
    expect(codeInput).toHaveAttribute("type", "number");
    const verify = screen.getByRole("button", { name: "Verify" });
    expect(verify).not.toBeEnabled();

    fireEvent.change(codeInput, {
      target: { value: "123456" },
    });

    await waitFor(() => {
      // 👉 verify button should be enabled
      expect(verify).toBeEnabled();
    });
    return verify;
  };
  const requestCalls = () => {
    expect(axiosPost).toHaveBeenCalledTimes(2);
    expect(axiosPost).toHaveBeenCalledWith("/verify", undefined, {
      params: { code: undefined },
    });
    expect(axiosPost).toHaveBeenCalledWith("/verify", undefined, {
      params: { code: "123456" },
    });
    // 👉 no get calls
    expect(axiosGet).toHaveBeenCalledTimes(0);
  };

  it("checks ssr", async () => {
    axiosGet.mockReturnValue(axiosData(authResult));
    const params = {
      req: { headers: { cookie: "cookie" } },
    } as GetServerSidePropsContext;

    const isAuthorized = await getServerSideProps(params);
    expect(isAuthorized).toEqual({
      redirect: {
        destination: "/?verified",
        permanent: false,
      },
    });
    expect(axiosGet).toHaveBeenCalledTimes(1);
    expect(axiosGet).toHaveBeenCalledWith("/auth", {
      headers: { Cookie: "cookie" },
    });

    axiosGet.mockClear();
    axiosGet.mockRejectedValue(null);
    axiosPost.mockRejectedValue(null);
    const notAuthorized = await getServerSideProps(params);
    expect(notAuthorized).toEqual({ props: {} });

    expect(axiosGet).toHaveBeenCalledTimes(1);
    expect(axiosGet).toHaveBeenCalledWith("/auth", {
      headers: { Cookie: "cookie" },
    });
    expect(axiosPost).toHaveBeenCalledTimes(1);
    expect(axiosPost).toHaveBeenCalledWith("/refresh", undefined, {
      headers: { Cookie: "cookie" },
    });
  });
  it("renders components", async () => {
    const appBar = screen.queryByRole("navigation");
    const send = screen.getByRole("button", { name: "Send code (Email)" });
    const form = screen.getByTestId("form-verify");

    // 👉 show controls
    expect(appBar).toBeFalsy();
    expect(send).toBeVisible();
    expect(send).toBeEnabled();
    expect(form).not.toHaveClass("show");

    expect(axiosPost).toHaveBeenCalledTimes(0);
    expect(axiosGet).toHaveBeenCalledTimes(0);
  });
  it("verifies code", async () => {
    const verify = await verifySteps();

    fireEvent.click(verify);
    await waitFor(() => {
      // 👉 verify button should not be enabled
      expect(verify).not.toBeEnabled();
      expect(verify.textContent).toEqual("Verified");
    });

    // 👉 post/get requests
    requestCalls();
  });
  it("verifies code (with error)", async () => {
    const verify = await verifySteps();

    // 👉 no errors should be shown
    const error = "Provided code doesn't match what the server was expecting.";
    expect(screen.queryByText(error)).toBeFalsy();

    fireEvent.click(verify);
    await waitFor(() => {
      // 👉 verify button should still be enabled
      expect(verify).toBeEnabled();
      expect(verify.textContent).toEqual("Verify");
      expect(screen.getByText(error)).toBeVisible();
    });

    // 👉 post/get requests
    requestCalls();
  });
});
