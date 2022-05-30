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

import { AxiosRequestConfig } from "axios";
import BackDrop from "@/components/BackDrop";
import Provider from "@/redux/Provider";
import Users, { getServerSideProps } from "@/pages/users";
import axios from "@/services/axios";
import {
  matchMedia,
  axiosError,
  axiosData,
  authResult,
} from "__mocks__/helpers";
import { userGroups } from "utils/constants";

jest.mock(
  "next/link",
  () =>
    ({ children }: React.PropsWithChildren<LinkProps>) =>
      children
);

describe("Users", () => {
  const useRouter = {
    route: "/",
    pathname: "/users",
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
  const axiosDelete = axios.delete as jest.Mock;

  const users = [
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

  beforeAll(() => {
    Object.defineProperty(window, "matchMedia", matchMedia);
  });
  beforeEach(async () => {
    const { currentTestName } = expect.getState();
    const usersError = currentTestName.endsWith("users (with error)");
    const groupError = currentTestName.endsWith("group (with error)");

    axiosGet.mockImplementation((url: string) => {
      switch (url) {
        case "/users":
          return usersError
            ? Promise.reject(axiosError({ name: "NotAuthorizedException" }))
            : Promise.resolve(axiosData(users));
        default:
          return Promise.resolve();
      }
    });
    axiosPost.mockImplementation(
      (url: string, _, config?: AxiosRequestConfig) => {
        switch (url) {
          case "/users":
            return groupError && config?.params.code === "123456"
              ? Promise.reject(axiosError({ name: "CodeMismatchException" }))
              : Promise.resolve();
          case "/user-group/manage_product_group":
            return groupError
              ? Promise.reject(axiosError({ name: "EmptyUsernameException" }))
              : Promise.resolve(
                  axiosData({
                    username: users[0].username,
                    group: "manage_product_group",
                  })
                );
          default:
            return Promise.resolve();
        }
      }
    );
    axiosDelete.mockImplementation((url: string) => {
      switch (url) {
        case "/user-group/admin_group":
          return groupError
            ? Promise.reject(axiosError({ name: "EmptyUsernameException" }))
            : Promise.resolve(
                axiosData({
                  username: users[0].username,
                  group: "",
                })
              );
        default:
          return Promise.resolve();
      }
    });

    await act(async () => {
      render(
        <Provider>
          <SSRProvider>
            <BackDrop>
              <Users />
            </BackDrop>
          </SSRProvider>
        </Provider>
      );
    });

    // 👉 get calls
    expect(axiosGet).toHaveBeenCalledTimes(4);
    expect(axiosGet).toHaveBeenCalledWith("/auth", undefined);
    expect(axiosGet).toHaveBeenCalledWith("/category");
    expect(axiosGet).toHaveBeenCalledWith("/country");
    expect(axiosGet).toHaveBeenCalledWith("/users");
    // 👉 post calls
    expect(axiosPost).toHaveBeenCalledTimes(1);
    expect(axiosPost).toHaveBeenCalledWith("/refresh", undefined, undefined);

    axiosGet.mockClear();
    axiosPost.mockClear();
    axiosDelete.mockClear();
  });
  afterEach(() => {
    cleanup();
    axiosGet.mockClear();
    axiosPost.mockClear();
    axiosDelete.mockClear();
  });
  afterAll(() => {
    jest.restoreAllMocks();
  });

  const loadUsers = async (error = false) => {
    const username = await screen.findByText("Username");
    const group = screen.getByText("Group");
    const gender = screen.getByText("Gender");
    const refresh = screen.getByTitle("Refresh");

    expect(screen.getAllByText("CONFIRMED")).toHaveLength(
      error ? 0 : users.length
    );

    if (error) {
      return;
    }

    // 👉 show controls
    expect(username).toBeVisible();
    expect(group).toBeVisible();
    expect(gender).toBeVisible();
    expect(refresh).toBeEnabled();

    users.forEach((user) => {
      expect(screen.getByText(user.username)).toBeVisible();
      expect(screen.getByText(user.gender)).toBeVisible();
      const groupDrop = screen.getByRole("button", {
        name: userGroups[user.group as keyof typeof userGroups],
      });
      expect(groupDrop).toBeVisible();
      expect(groupDrop).toHaveAttribute("aria-expanded", "false");
    });

    return refresh;
  };
  const changeGroup = async (remove = false) => {
    const groups = Object.values(userGroups);

    // 👉 group drop-down should be hidden
    groups.forEach((group) => {
      const find = screen.queryByText((content, element) =>
        Boolean(
          element?.className.includes("dropdown-item") && content === group
        )
      );
      expect(find).toBeFalsy();
    });
    // 👉 get first user group-down
    const groupDrop = screen.getByRole("button", {
      name: userGroups[users[0].group as keyof typeof userGroups], // 👉 Admin
    });

    fireEvent.click(groupDrop);
    // 👉 group drop-down should be visible
    await waitFor(() => {
      groups.forEach((group) => {
        const find = screen.getByText((content, element) =>
          Boolean(
            element?.className.includes("dropdown-item") && content === group
          )
        );
        expect(find).toBeVisible();
      });
    });

    // 👉 get item in group-down
    const find = screen.getByText((content, element) =>
      Boolean(
        element?.className.includes("dropdown-item") &&
          content ===
            (remove
              ? groups[0] // 👉 None
              : groups[1]) // 👉 Manage Products
      )
    );
    fireEvent.click(find);

    await waitFor(() => {
      // 👉 no get calls
      expect(axiosGet).toHaveBeenCalledTimes(0);
      if (remove) {
        // 👉 delete calls
        expect(axiosDelete).toHaveBeenCalledTimes(1);
        expect(axiosDelete).toHaveBeenCalledWith("/user-group/admin_group", {
          params: { username: "user1" },
        });
      } else {
        // 👉 post calls
        expect(axiosPost).toHaveBeenCalledTimes(1);
        expect(axiosPost).toHaveBeenCalledWith(
          "/user-group/manage_product_group",
          undefined,
          { params: { username: "user1" } }
        );
      }
    });

    return groupDrop;
  };

  it("checks ssr", async () => {
    axiosGet.mockReturnValue(axiosData(authResult));
    const params = {
      req: { headers: { cookie: "cookie" } },
    } as GetServerSidePropsContext;

    const isAuthorized = await getServerSideProps(params);
    expect(isAuthorized).toEqual({ props: {} });
    expect(axiosGet).toHaveBeenCalledTimes(1);
    expect(axiosGet).toHaveBeenCalledWith("/auth", {
      headers: { Cookie: "cookie" },
    });

    axiosGet.mockClear();
    axiosGet.mockRejectedValue(null);
    axiosPost.mockRejectedValue(null);
    const notAuthorized = await getServerSideProps(params);
    expect(notAuthorized).toEqual({
      redirect: {
        destination: "/?unauthorized",
        permanent: false,
      },
    });

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
    await loadUsers();

    // 👉 requests
    expect(axiosPost).toHaveBeenCalledTimes(0);
    expect(axiosGet).toHaveBeenCalledTimes(0);
  });
  it("refreshes users", async () => {
    const refresh = screen.getByTitle("Refresh");

    fireEvent.click(refresh);
    // 👉 users reloads
    await loadUsers();

    // 👉 requests
    expect(axiosPost).toHaveBeenCalledTimes(0);
    expect(axiosGet).toHaveBeenCalledTimes(1);
    expect(axiosGet).toHaveBeenCalledWith("/users");
  });
  it("refreshes users (with error)", async () => {
    const refresh = screen.getByTitle("Refresh");

    fireEvent.click(refresh);
    // 👉 users reloads
    await loadUsers();

    // 👉 requests
    expect(axiosPost).toHaveBeenCalledTimes(0);
    expect(axiosGet).toHaveBeenCalledTimes(1);
    expect(axiosGet).toHaveBeenCalledWith("/users");
    // 👉 show error
    expect(
      screen.getByText("You are not authorized to perform this action.")
    ).toBeVisible();
  });
  it("changes user group", async () => {
    const groupDrop = await changeGroup();

    expect(groupDrop.textContent).toEqual("Manage Products");
  });
  it("changes user group (with error)", async () => {
    const groupDrop = await changeGroup();

    expect(groupDrop.textContent).toEqual("Admin");
    // 👉 show error
    expect(screen.getByText("Username not specified.")).toBeVisible();
  });
  it("removes user from group", async () => {
    const groupDrop = await changeGroup(true);

    expect(groupDrop.textContent).toEqual("None");
  });
  it("removes user from group (with error)", async () => {
    const groupDrop = await changeGroup(true);

    expect(groupDrop.textContent).toEqual("Admin");
    // 👉 show error
    expect(screen.getByText("Username not specified.")).toBeVisible();
  });
});
