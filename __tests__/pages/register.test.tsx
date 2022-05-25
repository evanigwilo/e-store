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
import Register, { getServerSideProps } from "@/pages/register";
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

describe("Register", () => {
  const useRouter = {
    route: "/",
    pathname: "/register",
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
              <Register />
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
    const createButton = screen.getByRole("button", {
      name: "Create account",
    });
    const email = screen.getByLabelText("Email");
    const username = screen.getByLabelText("Username");
    const gender = screen.getByLabelText("Gender");
    const password = screen.getByLabelText("Password");
    const subscribe = screen.getByText(
      "Get emails about product updates, industry news, and events. " +
        "If you change your mind, you can unsubscribe at any time"
    );
    const signIn = screen.getByText("Sign in");

    // 👉 show username, email, gender, password and create account controls
    expect(signIn).toBeVisible();
    expect(email).toHaveValue("");
    expect(username).toHaveValue("");
    expect(gender.textContent).toEqual("Male");
    expect(password).toHaveValue("");
    expect(subscribe).toBeVisible();
    expect(createButton).toBeDisabled();
    expect(axiosPost).toHaveBeenCalledTimes(0);
  });
  it("routes to home page with valid register credentials", async () => {
    axiosPost.mockResolvedValue(authResult);

    const createButton = screen.getByRole("button", {
      name: "Create account",
    });
    const email = screen.getByLabelText("Email");
    const username = screen.getByLabelText("Username");
    const password = screen.getByLabelText("Password");
    const gender = screen.getByLabelText("Gender");
    expect(gender.textContent).toEqual("Male");

    //change username, email and password values
    fireEvent.change(email, {
      target: { value: "email@email.com" },
    });
    fireEvent.change(username, {
      target: { value: "username" },
    });
    fireEvent.change(password, {
      target: { value: "password" },
    });

    // 👉 change gender selection
    fireEvent.click(gender);
    const female = await screen.findByRole("button", {
      name: "Female",
    });
    expect(female).toBeVisible();
    fireEvent.click(female);

    await waitFor(() => {
      expect(email).toHaveValue("email@email.com");
      expect(username).toHaveValue("username");
      expect(password).toHaveValue("password");
      expect(gender.textContent).toEqual("Female");
      expect(createButton).toBeEnabled();
    });

    // 👉 success after create account is clicked and route to home page
    fireEvent.click(createButton);
    await waitFor(() => {
      expect(useRouter.push).toHaveBeenCalledTimes(1);
      expect(useRouter.push).toHaveBeenCalledWith("/", undefined, {
        shallow: true,
      });
    });
    expect(axiosPost).toHaveBeenCalledTimes(1);
  });
  it("renders error with invalid register credentials", async () => {
    axiosPost.mockRejectedValue(
      axiosError({ name: "UsernameExistsException" })
    );

    const createButton = screen.getByRole("button", {
      name: "Create account",
    });
    const email = screen.getByLabelText("Email");
    const username = screen.getByLabelText("Username");
    const password = screen.getByLabelText("Password");

    //change username, email and password values
    fireEvent.change(email, {
      target: { value: "email@email.com" },
    });
    fireEvent.change(username, {
      target: { value: "username" },
    });
    fireEvent.change(password, {
      target: { value: "password" },
    });

    expect(email).toHaveValue("email@email.com");
    expect(username).toHaveValue("username");
    expect(password).toHaveValue("password");
    expect(createButton).toBeEnabled();

    fireEvent.click(createButton);
    // 👉 error message should be visible
    const errorMessage = await screen.findByText("Username already exists.");
    expect(errorMessage).toBeVisible();
    expect(useRouter.push).toHaveBeenCalledTimes(0);

    expect(axiosPost).toHaveBeenCalledTimes(1);
  });
});
