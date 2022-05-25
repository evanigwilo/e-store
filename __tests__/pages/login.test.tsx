import {
  act,
  render,
  screen,
  waitFor,
  fireEvent,
  cleanup,
} from "@testing-library/react";
import { GetServerSidePropsContext } from "next";
import { LinkProps } from "next/link";
import SSRProvider from "react-bootstrap/SSRProvider";

import BackDrop from "@/components/BackDrop";
import Provider from "@/redux/Provider";
import Login, { getServerSideProps } from "@/pages/login";
import axios from "@/services/axios";
import {
  matchMedia,
  axiosError,
  axiosData,
  authResult,
} from "__mocks__/helpers";

jest.mock(
  "next/link",
  () =>
    ({ children }: React.PropsWithChildren<LinkProps>) =>
      children
);

describe("Login", () => {
  const useRouter = {
    route: "/",
    pathname: "/login",
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
    await act(async () => {
      render(
        <Provider>
          <SSRProvider>
            <BackDrop>
              <Login />
            </BackDrop>
          </SSRProvider>
        </Provider>
      );
    });
    axiosGet.mockClear();
    axiosPost.mockClear();
    useRouter.push.mockClear();
  });
  afterEach(() => {
    cleanup();
  });
  afterAll(() => {
    jest.restoreAllMocks();
  });

  it("checks ssr", async () => {
    axiosGet.mockReturnValue(axiosData(authResult));
    const params = {
      req: { headers: { cookie: "cookie" } },
    } as GetServerSidePropsContext;

    const isAuthorized = await getServerSideProps(params);
    expect(isAuthorized).toEqual({
      redirect: {
        destination: "/?logged",
        permanent: false,
      },
    });
    expect(axiosGet).toHaveBeenCalledTimes(1);

    axiosGet.mockClear();
    axiosGet.mockRejectedValue(null);
    axiosPost.mockRejectedValue(null);
    const notAuthorized = await getServerSideProps(params);
    expect(notAuthorized).toEqual({ props: {} });
    expect(axiosGet).toHaveBeenCalledTimes(1);
    expect(axiosPost).toHaveBeenCalledTimes(1);
  });
  it("renders components", () => {
    const continueButton = screen.getByRole("button", {
      name: "Continue",
    });
    const identity = screen.getByLabelText("Username or Email");
    const password = screen.getByLabelText("Password");
    const signUp = screen.getByText("Sign up");

    // 👉 show username/email, password and continue controls
    expect(signUp).toBeVisible();
    expect(identity).toHaveValue("");
    expect(password).toHaveValue("");
    expect(continueButton).toBeDisabled();
    expect(axiosPost).toHaveBeenCalledTimes(0);
  });
  it("routes to home page with valid login credentials", async () => {
    axiosPost.mockResolvedValue(authResult);

    const continueButton = screen.getByRole("button", {
      name: "Continue",
    });
    const identity = screen.getByLabelText("Username or Email");
    const password = screen.getByLabelText("Password");

    fireEvent.change(identity, {
      target: { value: "username" },
    });
    fireEvent.change(password, {
      target: { value: "password" },
    });

    //change username/email and password values
    expect(identity).toHaveValue("username");
    expect(password).toHaveValue("password");
    expect(continueButton).toBeEnabled();

    fireEvent.click(continueButton);

    // 👉 success after continue is clicked and route to home page
    await waitFor(() => {
      expect(useRouter.push).toHaveBeenCalledTimes(1);
      expect(useRouter.push).toHaveBeenCalledWith("/", undefined, {
        shallow: true,
      });
    });
    expect(axiosPost).toHaveBeenCalledTimes(1);
  });
  it("renders error with invalid login credentials", async () => {
    axiosPost.mockRejectedValue(axiosError({ name: "UserNotFoundException" }));

    const continueButton = screen.getByRole("button", {
      name: "Continue",
    });
    const identity = screen.getByLabelText("Username or Email");
    const password = screen.getByLabelText("Password");

    fireEvent.change(identity, {
      target: { value: "username" },
    });
    fireEvent.change(password, {
      target: { value: "password" },
    });

    //change username/email and password values
    expect(identity).toHaveValue("username");
    expect(password).toHaveValue("password");
    expect(continueButton).toBeEnabled();

    fireEvent.click(continueButton);

    const errorMessage = await screen.findByText(
      "Username or Email not found."
    );
    // 👉 error message should be visible
    expect(errorMessage).toBeVisible();
    expect(useRouter.push).toHaveBeenCalledTimes(0);
    expect(axiosPost).toHaveBeenCalledTimes(1);
  });
});
