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
import Products, { getServerSideProps } from "@/pages/products";
import {
  matchMedia,
  mockProducts,
  mockIntersectionObserver,
  Request,
  axiosData,
  authResult,
  categories,
  axiosError,
} from "__mocks__/helpers";
import { GetServerSidePropsContext } from "next";
import { Product } from "utils/types";
import { slotCount } from "utils/constants";
import { AxiosRequestConfig } from "axios";

jest.mock(
  "next/link",
  () =>
    ({ children }: React.PropsWithChildren<LinkProps>) =>
      children
);

describe("Products", () => {
  const useRouter = {
    route: "/",
    pathname: "/products",
    query: {},
    asPath: "",
    isReady: true,
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
  const axiosGet = axios.get as jest.Mock;
  const axiosPost = axios.post as jest.Mock;
  const axiosPut = axios.put as jest.Mock;
  const axiosDelete = axios.delete as jest.Mock;

  const mockAxiosPost =
    (productError = false, imageError = false) =>
    (url: string, data: Partial<Product>, config?: AxiosRequestConfig) => {
      switch (url) {
        case "/product":
          return productError
            ? Promise.reject(axiosError({ name: "InvalidPriceException" }))
            : Promise.resolve(
                axiosData({
                  ...data,
                  createdAt: 123,
                  id: "id",
                })
              );
        case "/product/id/image":
          return Promise.resolve(
            axiosData({ url: "/url", fields: { slot: config?.params.slot } })
          );
        case "/url":
          return imageError
            ? Promise.reject({
                response: {
                  headers: { "content-type": "application/xml" },
                  data: `<Error>
            <Code>AccessDenied</Code>
            <Message>Access Denied</Message>
            </Error>`,
                },
              })
            : Promise.resolve({ status: 204, statusText: "No Content" });
        default:
          return Promise.resolve();
      }
    };
  const mockAxiosPut =
    (productError = false) =>
    (url: string, data: Partial<Product>) => {
      switch (url) {
        case "/product/id":
          return productError
            ? Promise.reject(axiosError({ name: "Forbidden" }))
            : Promise.resolve(
                axiosData({
                  ...data,
                  createdAt: 123,
                  id: "id",
                })
              );
        default:
          return Promise.resolve();
      }
    };
  const mockAxiosDelete =
    (productError = false, imageError = false) =>
    (url: string) => {
      switch (url) {
        case "/product/id/image":
          return imageError
            ? Promise.reject(axiosError({ message: "Forbidden" }))
            : Promise.resolve();
        case "/product/id":
          return productError
            ? Promise.reject()
            : Promise.resolve(axiosData({}));
        default:
          return Promise.resolve();
      }
    };

  const initialRun = {
    firstRun: true,
    createProduct: {
      currentState: false,
      firstRun: true,
    },
    editProduct: {
      currentState: false,
      firstRun: true,
    },
  };

  const initialRequests = (firstRender: boolean, editProduct: boolean) => {
    expect(axiosPut).toHaveBeenCalledTimes(0);
    expect(axiosPost).toHaveBeenCalledTimes(1);
    expect(axiosPost).toHaveBeenCalledWith("/order/cart", []);
    expect(axiosGet).toHaveBeenCalledWith("/country");
    if (firstRender) {
      expect(axiosGet).toHaveBeenCalledWith("/category");
      expect(axiosGet).toHaveBeenCalledTimes(3);
    } else if (editProduct) {
      expect(axiosGet).toHaveBeenCalledWith("/product/id");
      expect(axiosGet).toHaveBeenCalledTimes(3);
    } else {
      expect(axiosGet).toHaveBeenCalledTimes(2);
    }
  };

  beforeAll(() => {
    fetchMock.mockImplementation(((input: Request) =>
      Promise.resolve({
        status: 200,
        clone: jest.fn().mockReturnValue({
          text: () => Promise.resolve(""),
        } as Partial<Response>),
        text: () => Promise.resolve(JSON.stringify(mockProducts)),
      } as Partial<Response>)) as any);

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
    const { createProduct, editProduct } = initialRun;
    if (currentTestName.endsWith("(create product dialog)")) {
      createProduct.currentState = true;
      useRouter.query = { id: "" };
    } else if (currentTestName.endsWith("(edit product dialog)")) {
      editProduct.currentState = true;
      useRouter.query = { id: "id" };
    }

    window.URL.createObjectURL = jest.fn();
    window.URL.revokeObjectURL = jest.fn();

    axiosGet.mockImplementation((url: string) => {
      switch (url) {
        case "/auth":
          return Promise.resolve(axiosData(authResult));
        case "/category":
          return Promise.resolve(axiosData(categories));
        case "/product/id":
          return Promise.resolve(
            axiosData({
              id: "id",
              name: "product",
              category: categories[1],
              price: 5,
              image_1: true,
              image_2: false,
              image_3: false,
              createdAt: 123,
            } as Partial<Product>)
          );
        default:
          return Promise.resolve();
      }
    });
    axiosPut.mockImplementation(mockAxiosPut());
    axiosPost.mockImplementation(mockAxiosPost());
    axiosDelete.mockImplementation(mockAxiosDelete());

    await act(async () => {
      render(
        <Provider>
          <SSRProvider>
            <BackDrop>
              <Products />
            </BackDrop>
          </SSRProvider>
        </Provider>
      );
    });

    // 👉 initial call
    if (initialRun.firstRun) {
      initialRun.firstRun = false;
      initialRequests(true, false);
    }
    if (createProduct.currentState && createProduct.firstRun) {
      createProduct.firstRun = false;
      initialRequests(false, false);
    }
    if (editProduct.currentState && editProduct.firstRun) {
      editProduct.firstRun = false;
      initialRequests(false, true);
    }

    fetchMock.mockClear();
    useRouter.push.mockClear();
    axiosGet.mockClear();
    axiosPost.mockClear();
    axiosPut.mockClear();
    axiosDelete.mockClear();
  });
  afterEach(() => {
    cleanup();
    fetchMock.mockClear();
    useRouter.push.mockClear();
    axiosGet.mockClear();
    axiosPost.mockClear();
    axiosPut.mockClear();
    axiosDelete.mockClear();
  });
  afterAll(() => {
    jest.restoreAllMocks();
  });

  it("checks ssr", async () => {
    const params = {
      req: { headers: { cookie: "cookie" } },
    } as GetServerSidePropsContext;

    const isAuthorized = await getServerSideProps(params);
    expect(isAuthorized).toEqual({ props: {} });
    expect(axiosGet).toHaveBeenCalledTimes(1);

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
    expect(axiosPost).toHaveBeenCalledTimes(1);
  });
  it("renders components", async () => {
    const appBar = screen.getByRole("navigation");
    const filterBy = screen.getByText("Filter By -");
    const filterOptions = screen.getByRole("button", {
      name: "All Products",
    });
    const addProduct = screen.getByRole("button", {
      name: "Add Product",
    });
    const noProducts = screen.getByText("No more products");

    // 👉 show controls
    expect(filterBy).toBeVisible();
    expect(filterOptions).toHaveAttribute("aria-expanded", "false");
    expect(filterOptions).toBeVisible();
    expect(addProduct).toBeVisible();
    expect(noProducts).toBeVisible();
    expect(appBar).toBeVisible();

    //show Header
    expect(screen.getByText("Product Name")).toBeVisible();
    expect(screen.getByText("Price")).toBeVisible();
    expect(screen.getByText("Category")).toBeVisible();
    expect(screen.getByText("Date Created")).toBeVisible();
    expect(screen.getByText("Status")).toBeVisible();

    // 👉 show products
    const products = screen.getAllByTestId(/^id-/);
    const edit = screen.getAllByTitle("Edit");
    expect(edit).toHaveLength(products.length);

    products.forEach((product, idx) => {
      const { category, name, price } = mockProducts.queryResult[idx];
      // 👉 show product information
      expect(product.innerHTML.includes(`>${category}`)).toBeTruthy();
      expect(product.innerHTML.includes(`>${name}`)).toBeTruthy();
      expect(
        product.innerHTML.includes(`>${numeral(price).format("$0,0.00")}<`)
      ).toBeTruthy();
      expect(product.innerHTML.includes(">Jan 1, 1970")).toBeTruthy();
      expect(product.innerHTML.includes(">Published")).toBeTruthy();
      // 👉 product images
      expect(product.getElementsByTagName("img")).toHaveLength(1);
    });

    // 👉 no requests till now
    expect(fetchMock).toHaveBeenCalledTimes(0);
    expect(axiosPost).toHaveBeenCalledTimes(0);
    expect(axiosGet).toHaveBeenCalledTimes(0);
  });
  it("should show filter options", async () => {
    const filterOptions = screen.getByRole("button", {
      name: "All Products",
    });
    // 👉 filter options should be hidden
    expect(filterOptions).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(filterOptions);
    // 👉 filter options should be visible showing 'All Products'
    await waitFor(() => {
      expect(filterOptions).toHaveAttribute("aria-expanded", "true");
    });

    // 👉 filter option 'All Products' should be selected
    const filterAllProducts = screen.getByText((content, element) =>
      Boolean(
        element?.className.includes("dropdown-item") &&
          content === "All Products"
      )
    );
    expect(filterAllProducts).toHaveAttribute("aria-selected", "true");

    // 👉 all other filter options should not be selected
    categories.forEach((category) => {
      const filter = screen.getByText((content, element) =>
        Boolean(
          element?.className.includes("dropdown-item") && content === category
        )
      );
      expect(filter).toHaveAttribute("aria-selected", "false");
    });
    const filterGrocery = screen.getByText((content, element) =>
      Boolean(
        element?.className.includes("dropdown-item") &&
          content === categories[0] // 👉 Grocery
      )
    );

    fireEvent.click(filterGrocery);
    // 👉 filter option 'Grocery' should be selected
    await waitFor(() => {
      expect(filterOptions).toHaveAttribute("aria-expanded", "false");
      expect(filterOptions.textContent).toEqual("Grocery");
      expect(filterAllProducts).toHaveAttribute("aria-selected", "false");
      expect(filterGrocery).toHaveAttribute("aria-selected", "true");
    });

    // 👉 requests to the specific routes
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const request = fetchMock.mock.calls[0][0] as Request;
    expect(request.url).toEqual(
      `${process.env.NEXT_PUBLIC_SERVER_BASE_URL}/v1/products?category=Grocery`
    );
    expect(request.credentials).toEqual("same-origin");
    expect(request.method).toEqual("POST");
    expect(request.mode).toEqual(null);
  });
  it("routes to new product route", async () => {
    const addProduct = screen.getByRole("button", {
      name: "Add Product",
    });
    expect(addProduct).toBeVisible();

    // 👉 (create product dialog) should be hidden
    expect(screen.queryByRole("dialog")).toBeFalsy();

    fireEvent.click(addProduct);

    // 👉 changes route to create product route
    await waitFor(() => {
      expect(useRouter.push).toHaveBeenCalledTimes(1);
      expect(useRouter.push).toHaveBeenCalledWith("/products?id=", undefined, {
        shallow: true,
      });
    });
  });

  it("shows (create product dialog)", async () => {
    const createProduct = screen.getByRole("dialog");
    // 👉 create products dialog should be visible
    expect(createProduct).toBeVisible();

    const title = screen.getByText("Add New Product");
    const close = title.nextSibling!;
    const productName = screen.getByLabelText("Product Name");
    const productCategory = screen.getByLabelText("Category");
    const productPrice = screen.getByPlaceholderText("0.00");
    const noImage = createProduct.querySelectorAll("img");
    const uploadIcons = createProduct.getElementsByClassName("bi-cloud-upload");
    const uploadButtons = screen.getAllByTitle("Upload") as HTMLInputElement[];
    const cancel = screen.getByRole("button", { name: "Cancel" });
    const publish = screen.getByRole("button", { name: "Publish" });
    const deleteProduct = createProduct.getElementsByClassName("bi-trash3");
    const slotTotal = slotCount.length;

    // 👉 check control properties
    expect(title).toBeVisible();
    expect(productName).toHaveValue("");
    expect(productCategory).toHaveValue(categories[0]); // 👉 Grocery
    expect(productPrice).toHaveAttribute("type", "number");
    expect(productPrice).toHaveValue(null);
    expect(noImage).toHaveLength(0);
    expect(uploadIcons).toHaveLength(slotTotal);
    expect(uploadButtons).toHaveLength(slotTotal);
    uploadButtons.forEach((button) => expect(button).not.toBeVisible);
    expect(close).toBeVisible();
    expect(close).toHaveClass("btn-close");
    expect(cancel).toBeEnabled();
    expect(cancel).toBeVisible();
    expect(publish).toBeEnabled();
    expect(publish).toBeVisible();
    expect(deleteProduct).toHaveLength(0);

    let categoryDrop = createProduct.getElementsByClassName("dropdown-menu");
    expect(categoryDrop).toHaveLength(0);

    fireEvent.click(productCategory);
    // 👉 show categories dropdown
    await waitFor(() => {
      categoryDrop = createProduct.getElementsByClassName("dropdown-menu");
      expect(categoryDrop).toHaveLength(1);
    });
    // 👉 change category from 'Grocery' to 'Electronics'
    fireEvent.click(categoryDrop[0].children[1]); // 👉 Electronics
    await waitFor(() => {
      expect(productCategory).toHaveValue(categories[1]); // 👉 Electronics
    });
    // 👉 no requests till now
    expect(fetchMock).toHaveBeenCalledTimes(0);
    expect(axiosPost).toHaveBeenCalledTimes(0);
    expect(axiosGet).toHaveBeenCalledTimes(0);
  });
  it("creates a product in (create product dialog)", async () => {
    const createProduct = screen.getByRole("dialog");
    // 👉 create products dialog should be visible
    expect(createProduct).toBeVisible();

    const productName = screen.getByLabelText("Product Name");
    const productPrice = screen.getByPlaceholderText("0.00");
    const publish = screen.getByRole("button", { name: "Publish" });

    fireEvent.click(publish);
    // 👉 show product error
    expect(await screen.findByText("Product name is not valid.")).toBeVisible();

    // 👉 change input values
    fireEvent.change(productName, {
      target: { value: "product" },
    });
    fireEvent.change(productPrice, {
      target: { value: "5" },
    });

    fireEvent.click(publish);
    await waitFor(() => {
      // 👉 changes route to edit product route
      expect(useRouter.push).toHaveBeenCalledTimes(1);
      expect(useRouter.push).toHaveBeenCalledWith(
        "/products?id=id",
        undefined,
        {
          shallow: true,
        }
      );
      // 👉 created product url
      expect(axiosPost).toHaveBeenCalledTimes(1);
      expect(axiosPost).toHaveBeenCalledWith("/product", {
        category: categories[0], //"Grocery",
        name: "product",
        price: 5,
      });
    });
  });
  it("closes (create product dialog)", async () => {
    const createProduct = screen.getByRole("dialog");
    // 👉 create products dialog should be visible
    expect(createProduct).toBeVisible();

    const cancel = screen.getByRole("button", { name: "Cancel" });

    // 👉 check control properties
    expect(cancel).toBeEnabled();
    expect(cancel).toBeVisible();

    fireEvent.click(cancel);
    await waitFor(() => {
      // 👉 create products dialog should not be visible
      expect(createProduct).not.toBeVisible();
    });
    // 👉 no requests till now
    expect(fetchMock).toHaveBeenCalledTimes(0);
    expect(axiosPost).toHaveBeenCalledTimes(0);
    expect(axiosGet).toHaveBeenCalledTimes(0);
  });
  it("should show image preview in (create product dialog)", async () => {
    window.URL.createObjectURL = jest
      .fn()
      .mockReturnValue("blob:https://localhost:3000/12345");

    const createProduct = screen.getByRole("dialog");
    // 👉 create products dialog should be visible
    expect(createProduct).toBeVisible();

    const upload = screen.getAllByTitle("Upload")[0] as HTMLInputElement;

    // 👉 create dummy image of a valid size == 1MB
    const file = new File(["file"], "file.png", { type: "image/png" });
    Object.defineProperty(file, "size", { value: 1024 * 1024 });

    // 👉 change image file
    fireEvent.change(upload, {
      target: { files: [file] },
    });

    // 👉 have only one image file
    await waitFor(() => {
      expect(upload.files![0].name).toBe(file.name);
      expect(upload.files!.length).toBe(1);
    });

    const image = screen.getByTitle("Preview");

    expect(screen.queryAllByRole("dialog")).toHaveLength(1);

    fireEvent.click(image);

    // 👉 preview should be visible
    const dialogs = await screen.findAllByRole("dialog");
    expect(dialogs).toHaveLength(2);
    expect(dialogs[1]).toBeVisible();

    // 👉 upload label should be shown
    const uploadLabel = dialogs[1].getElementsByTagName("label")[0];
    expect(uploadLabel).toBeVisible();

    // 👉 no requests till now
    expect(fetchMock).toHaveBeenCalledTimes(0);
    expect(axiosPost).toHaveBeenCalledTimes(0);
    expect(axiosGet).toHaveBeenCalledTimes(0);
  });
  it("creates with images error from client in (create product dialog)", async () => {
    const createProduct = screen.getByRole("dialog");
    // 👉 create products dialog should be visible
    expect(createProduct).toBeVisible();

    const uploadButtons = screen.getAllByTitle("Upload") as HTMLInputElement[];
    const publish = screen.getByRole("button", { name: "Publish" });
    const slotTotal = slotCount.length;

    // 👉 no image errors initially
    expect(screen.queryAllByTitle("Image Error")).toHaveLength(0);
    // 👉 create dummy image with size > 1MB
    const file = new File(["file"], "file.png", { type: "image/png" });
    Object.defineProperty(file, "size", {
      value: 1024 * 1024 + 1,
      // 👉 configurable: true,
    });

    for (const upload of uploadButtons) {
      // 👉 no image initially
      expect(upload.files?.length).toBeFalsy();
      fireEvent.change(upload, {
        target: { files: [file] },
      });
      // 👉 have only one image file
      await waitFor(() => {
        expect(upload.files![0].name).toBe(file.name);
        expect(upload.files!.length).toBe(1);
      });
    }
    // 👉 publish button should be disabled
    expect(publish).not.toBeEnabled();
    // 👉 image size error should not be shown yet
    expect(screen.queryAllByText("Maximum allowed size is 1 MB.")).toHaveLength(
      0
    );
    // 👉 image error toggle should be shown on all slots
    const errors = screen.getAllByTitle("Image Error");
    expect(errors).toHaveLength(slotTotal);

    for (const error of errors) {
      expect(error).toBeVisible();
      // 👉 toggle error
      fireEvent.click(error);
      const errorText = await screen.findAllByText(
        "Maximum allowed size is 1 MB."
      );
      // 👉 only this error for the particular slot should be visible
      expect(errorText).toHaveLength(1);
      expect(errorText[0]).toBeVisible();

      // 👉 toggle error
      fireEvent.click(error);
      // 👉 this error for the particular slot should now be hidden
      await waitFor(() => {
        expect(
          screen.queryAllByText("Maximum allowed size is 1 MB.")
        ).toHaveLength(0);
      });
    }
    // 👉 no requests
    expect(axiosPost).toHaveBeenCalledTimes(0);
    expect(axiosGet).toHaveBeenCalledTimes(0);
  });
  it("creates with images error from server in (create product dialog)", async () => {
    const createProduct = screen.getByRole("dialog");
    // 👉 create products dialog should be visible
    expect(createProduct).toBeVisible();

    const uploadButtons = screen.getAllByTitle("Upload") as HTMLInputElement[];
    const publish = screen.getByRole("button", { name: "Publish" });
    const slotTotal = slotCount.length;

    // 👉 create dummy image of a valid size == 1MB
    const file = new File(["file"], "file.png", { type: "image/png" });
    Object.defineProperty(file, "size", { value: 1024 * 1024 });

    for (const upload of uploadButtons) {
      // 👉 change image file
      fireEvent.change(upload, {
        target: { files: [file] },
      });

      // 👉 have only one image file
      await waitFor(() => {
        expect(upload.files![0].name).toBe(file.name);
        expect(upload.files!.length).toBe(1);
      });
    }
    // 👉 publish button should be enabled
    expect(publish).toBeEnabled();
    // 👉 no image error toggle should be shown on any slots
    expect(screen.queryAllByTitle("Image Error")).toHaveLength(0);

    // 👉 change product name
    const productName = screen.getByLabelText("Product Name");
    fireEvent.change(productName, { target: { value: "product" } });

    // 👉 mock image error
    axiosPost.mockImplementation(mockAxiosPost(false, true));

    fireEvent.click(publish);

    // 👉 image error toggle should be shown on all slots
    const errors = await screen.findAllByTitle("Image Error");
    expect(errors).toHaveLength(slotTotal);

    for (const error of errors) {
      expect(error).toBeVisible();
      // 👉 toggle error
      fireEvent.click(error);
      const errorText = await screen.findAllByText("Access Denied");
      // 👉 only this error for the particular slot should be visible
      expect(errorText).toHaveLength(1);
      expect(errorText[0]).toBeVisible();

      // 👉 toggle error
      fireEvent.click(error);
      // 👉 this error for the particular slot should now be hidden
      await waitFor(() => {
        expect(screen.queryAllByText("Access Denied")).toHaveLength(0);
      });
    }

    // 👉 call to create product, get upload urls for each slot, and upload to the requested urls
    expect(axiosPost).toHaveBeenCalledTimes(1 + slotTotal + slotTotal);
    // 👉 post create product
    expect(axiosPost).toHaveBeenCalledWith("/product", {
      name: "product",
      category: "Grocery",
      price: 0,
    });

    slotCount.forEach((slot) => {
      const slotToString = slot.toString();
      // 👉 post get upload url
      expect(axiosPost).toHaveBeenCalledWith(
        "/product/id/image",
        { fileType: "image/png" },
        { params: { slot: slotToString } }
      );

      const formData = new FormData();
      formData.append("slot", slotToString);
      formData.append("file", file);
      // 👉 post upload to requested url
      expect(axiosPost).toHaveBeenCalledWith("/url", formData);
    });

    // 👉 changes route to edit product route
    expect(useRouter.push).toHaveBeenCalledTimes(1);
    expect(useRouter.push).toHaveBeenCalledWith("/products?id=id", undefined, {
      shallow: true,
    });
  });
  it("creates with valid images in (create product dialog)", async () => {
    const createProduct = screen.getByRole("dialog");
    // 👉 create products dialog should be visible
    expect(createProduct).toBeVisible();

    const uploadButtons = screen.getAllByTitle("Upload") as HTMLInputElement[];
    const publish = screen.getByRole("button", { name: "Publish" });
    const slotTotal = slotCount.length;

    // 👉 create dummy image of a valid size == 1MB
    const file = new File(["file"], "file.png", { type: "image/png" });
    Object.defineProperty(file, "size", { value: 1024 * 1024 });

    for (const upload of uploadButtons) {
      // 👉 change image file
      fireEvent.change(upload, {
        target: { files: [file] },
      });

      // 👉 have only one image file
      await waitFor(() => {
        expect(upload.files![0].name).toBe(file.name);
        expect(upload.files!.length).toBe(1);
      });
    }
    // 👉 publish button should be enabled
    expect(publish).toBeEnabled();
    // 👉 no image error toggle should be shown on any slots
    expect(screen.queryAllByTitle("Image Error")).toHaveLength(0);

    // 👉 change product name
    const productName = screen.getByLabelText("Product Name");
    fireEvent.change(productName, { target: { value: "product" } });

    fireEvent.click(publish);
    // 👉 requests to the specific routes
    await waitFor(() => {
      // 👉 call to create product, get upload urls for each slot, and upload to the requested urls
      expect(axiosPost).toHaveBeenCalledTimes(1 + slotTotal + slotTotal);
      // 👉 post create product
      expect(axiosPost).toHaveBeenCalledWith("/product", {
        name: "product",
        category: "Grocery",
        price: 0,
      });

      slotCount.forEach((slot) => {
        const slotToString = slot.toString();
        // 👉 post get upload url
        expect(axiosPost).toHaveBeenCalledWith(
          "/product/id/image",
          { fileType: "image/png" },
          { params: { slot: slotToString } }
        );

        const formData = new FormData();
        formData.append("slot", slotToString);
        formData.append("file", file);
        // 👉 post upload to requested url
        expect(axiosPost).toHaveBeenCalledWith("/url", formData);
      });

      // 👉 changes route to edit product route
      expect(useRouter.push).toHaveBeenCalledTimes(1);
      expect(useRouter.push).toHaveBeenCalledWith(
        "/products?id=id",
        undefined,
        {
          shallow: true,
        }
      );
    });
  });
  it("creates with product error in (create product dialog)", async () => {
    const createProduct = screen.getByRole("dialog");
    // 👉 create products dialog should be visible
    expect(createProduct).toBeVisible();

    const publish = screen.getByRole("button", { name: "Publish" });
    // 👉 mock product error
    axiosPost.mockImplementation(mockAxiosPost(true));

    // 👉 change input values
    const productName = screen.getByLabelText("Product Name");
    fireEvent.change(productName, { target: { value: "product" } });

    const priceError = "Price is not valid.";
    expect(screen.queryByText(priceError)).toBeFalsy();

    fireEvent.click(publish);
    // 👉 show product error
    expect(await screen.findByText(priceError)).toBeVisible();

    // 👉 created product url
    expect(axiosPost).toHaveBeenCalledTimes(1);
    expect(axiosPost).toHaveBeenCalledWith("/product", {
      category: categories[0], //"Grocery",
      name: "product",
      price: 0,
    });
    // 👉 no route change
    expect(useRouter.push).toHaveBeenCalledTimes(0);
  });

  it("shows (edit product dialog)", async () => {
    const editProduct = screen.getByRole("dialog");
    // 👉 (edit product dialog) should be visible
    expect(editProduct).toBeVisible();

    // 👉 make image Loaded
    const image = screen.getByTitle("Preview");
    fireEvent.load(image);

    const title = await screen.findByText("Edit Product");
    const close = title.nextSibling!;
    const productName = screen.getByLabelText("Product Name");
    const productCategory = screen.getByLabelText("Category");
    const productPrice = screen.getByPlaceholderText("0.00");
    const noImage = editProduct.querySelectorAll("img");
    const uploadIcons = editProduct.getElementsByClassName("bi-cloud-upload");
    const uploadButtons = screen.getAllByTitle("Upload") as HTMLInputElement[];

    // 👉 screen.debug(uploadButtons[0].nextSibling);
    const cancel = screen.getByRole("button", { name: "Cancel" });
    const publish = screen.getByRole("button", { name: "Publish" });
    const deleteProduct = editProduct.getElementsByClassName("bi-trash3")[0];
    const deleteImage = screen.getByTitle("Delete");
    const slotTotal = slotCount.length;

    // 👉 check control properties
    expect(title).toBeVisible();
    expect(productName).toHaveValue("product");
    expect(productCategory).toHaveValue(categories[1]); // 👉 Electronics
    expect(productPrice).toHaveAttribute("type", "number");
    expect(productPrice).toHaveValue(5);
    expect(noImage).toHaveLength(1);
    expect(uploadIcons).toHaveLength(slotTotal - 1);
    expect(uploadButtons).toHaveLength(slotTotal);
    uploadButtons.forEach((button) => expect(button).not.toBeVisible);
    expect(close).toBeVisible();
    expect(close).toHaveClass("btn-close");
    expect(cancel).toBeEnabled();
    expect(cancel).toBeVisible();
    expect(publish).toBeEnabled();
    expect(publish).toBeVisible();
    expect(deleteProduct);
    expect(deleteProduct).toBeEnabled();
    expect(deleteProduct).toBeVisible();
    expect(deleteImage).toBeVisible();

    // 👉 no requests till now
    expect(fetchMock).toHaveBeenCalledTimes(0);
    expect(axiosPost).toHaveBeenCalledTimes(0);
    expect(axiosGet).toHaveBeenCalledTimes(0);
  });
  it("clears image in (edit product dialog)", async () => {
    const editProduct = screen.getByRole("dialog");
    // 👉 (edit product dialog) should be visible
    expect(editProduct).toBeVisible();

    // 👉 make image Loaded
    const image = screen.getByTitle("Preview");
    expect(image).toBeVisible();
    fireEvent.load(image);

    const deleteImage = await screen.findByTitle("Delete");
    // 👉 check control properties
    expect(deleteImage).toBeVisible();

    fireEvent.click(deleteImage);

    // 👉 no image should be visible
    await waitFor(() => {
      expect(screen.queryByTitle("Delete")).toBeFalsy();
      expect(screen.queryByTitle("Preview")).toBeFalsy();
      expect(useRouter.push).toHaveBeenCalledTimes(0);
      // 👉 no post/delete requests till now
      expect(axiosPost).toHaveBeenCalledTimes(0);
      expect(axiosDelete).toHaveBeenCalledTimes(0);
    });
  });

  const deleteImage = async (error = false) => {
    const editProduct = screen.getByRole("dialog");
    // 👉 (edit product dialog) should be visible
    expect(editProduct).toBeVisible();

    // 👉 make image Loaded
    const image = screen.getByTitle("Preview");
    expect(image).toBeVisible();
    fireEvent.load(image);

    const deleteImage = await screen.findByTitle("Delete");
    // 👉 check control properties
    expect(deleteImage).toBeVisible();

    fireEvent.click(deleteImage);

    // 👉 no image should be visible
    await waitFor(() => {
      expect(screen.queryByTitle("Delete")).toBeFalsy();
      expect(screen.queryByTitle("Preview")).toBeFalsy();
    });

    const publish = screen.getByRole("button", { name: "Publish" });
    expect(publish).toBeEnabled();
    expect(publish).toBeVisible();
    // 👉 mock image error
    axiosDelete.mockImplementation(mockAxiosDelete(false, error));

    fireEvent.click(publish);
    await waitFor(() => {
      // 👉  post/delete requests till now
      expect(axiosPost).toHaveBeenCalledTimes(0);
      expect(axiosPut).toHaveBeenCalledTimes(1);
      expect(axiosPut).toHaveBeenCalledWith("/product/id", {
        category: "Electronics",
        name: "product",
        price: 5,
      });
      expect(axiosDelete).toHaveBeenCalledTimes(1);
      expect(axiosDelete).toHaveBeenCalledWith("/product/id/image", {
        params: { slot: "1" },
      });
    });

    if (error) {
      // 👉 image error toggle should be shown
      const error = screen.getByTitle("Image Error");
      expect(error).toBeVisible();
      fireEvent.click(error);
      const errorText = "You are not authorized to perform this action.";
      expect(await screen.findByText(errorText)).toBeVisible();
    } else {
      // 👉 no image error toggle should be shown
      expect(screen.queryByTitle("Image Error")).toBeFalsy();
    }
  };
  it("deletes image form server in (edit product dialog)", async () => {
    await deleteImage();
  });
  it("deletes image form server with error in (edit product dialog)", async () => {
    await deleteImage(true);
  });
  const deletesProduct = async (error = false) => {
    const editProduct = screen.getByRole("dialog");
    // 👉 (edit product dialog) should be visible
    expect(editProduct).toBeVisible();

    // 👉 make image Loaded
    const image = screen.getByTitle("Preview");
    fireEvent.load(image);

    const deleteProduct = editProduct.getElementsByClassName("bi-trash3")[0];
    const deleteImage = await screen.findByTitle("Delete");

    // 👉 check control properties
    expect(deleteImage).toBeVisible();
    expect(deleteProduct).toBeVisible();

    // 👉 delete modal should be hidden
    expect(screen.getAllByRole("dialog")).toHaveLength(1);

    fireEvent.click(deleteProduct);

    // 👉 delete modal should be visible
    const dialogs = await screen.findAllByRole("dialog");
    expect(dialogs).toHaveLength(2);
    const deleteDialog = dialogs[1];
    expect(deleteDialog).toBeVisible();

    const understoodDelete = screen.getByRole("button", { name: "Understood" });
    const closeDelete = understoodDelete.previousSibling!;

    expect(closeDelete).toBeVisible();
    expect(closeDelete.textContent).toEqual("Close");
    expect(understoodDelete).toBeVisible();

    // 👉 mock product error
    axiosDelete.mockImplementation(mockAxiosDelete(error));

    fireEvent.click(understoodDelete);
    // 👉 changes route closes (edit product dialog)
    await waitFor(() => {
      // 👉 call to delete a product
      expect(axiosDelete).toHaveBeenCalledTimes(1);
      expect(axiosDelete).toHaveBeenCalledWith("/product/id");
      // 👉 no post requests till now
      expect(axiosPost).toHaveBeenCalledTimes(0);
    });

    if (error) {
      expect(screen.queryAllByRole("dialog")).toHaveLength(2);
      expect(useRouter.push).toHaveBeenCalledTimes(0);
    } else {
      expect(screen.queryAllByRole("dialog")).toHaveLength(0);
      // 👉 changes route closes (edit product dialog)
      expect(useRouter.push).toHaveBeenCalledTimes(1);
      expect(useRouter.push).toHaveBeenCalledWith("/products", undefined, {
        shallow: true,
      });
    }
  };
  it("performs delete product in (edit product dialog)", async () => {
    await deletesProduct();
  });
  it("performs delete product with error in (edit product dialog)", async () => {
    await deletesProduct(true);
  });
  it("cancels delete product in (edit product dialog)", async () => {
    const editProduct = screen.getByRole("dialog");
    // 👉 (edit product dialog) should be visible
    expect(screen.getByRole("dialog")).toBeVisible();

    // 👉 make image Loaded
    fireEvent.load(screen.getByTitle("Preview"));

    const deleteProduct = editProduct.getElementsByClassName("bi-trash3")[0];

    // 👉 check control properties
    expect(deleteProduct).toBeVisible();

    // 👉 delete modal should be hidden
    expect(screen.getAllByRole("dialog")).toHaveLength(1);

    fireEvent.click(deleteProduct);

    // 👉 delete modal should be visible
    expect(await screen.findAllByRole("dialog")).toHaveLength(2);

    const closeDelete = screen.getByRole("button", { name: "Understood" })
      .previousSibling!;

    fireEvent.click(closeDelete);
    // 👉 closes (edit product dialog)
    await waitFor(() => {
      expect(screen.queryAllByRole("dialog")).toHaveLength(1);
      expect(useRouter.push).toHaveBeenCalledTimes(0);
      // 👉 no post/delete requests till now
      expect(axiosPost).toHaveBeenCalledTimes(0);
      expect(axiosDelete).toHaveBeenCalledTimes(0);
    });
  });
});
