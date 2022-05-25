import {
  AuthenticatedResult,
  KeyValue,
  QueryOrder,
  QueryParams,
} from "utils/types";
import { AxiosError } from "axios";
import { categoryType } from "utils/constants";

// 👇 Types
export type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>;
    }
  : T;

export type Request = {
  url: string;
  credentials: string;
  method: string;
  mode: string;
};

// 👇 Constants
export const authResult: AuthenticatedResult = {
  admin: true,
  emailVerified: true,
  manageProducts: true,
  username: "user",
  tokens: {},
};

export const mockProducts = {
  lastKey: {},
  queryResult: [
    {
      category: "Grocery",
      createdAt: 123,
      image_1: true,
      id: "id-1",
      price: 100,
      name: "Rice",
    },
    {
      category: "Grocery",
      createdAt: 123,
      image_1: true,
      image_2: true,
      id: "id-2",
      price: 200,
      name: "Oil",
    },
    {
      category: "Grocery",
      createdAt: 123,
      image_1: true,
      image_2: true,
      image_3: true,
      id: "id-3",
      price: 300,
      name: "Coffee",
    },
  ],
};

export const matchMedia = {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // Deprecated
    removeListener: jest.fn(), // Deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
};

export const categories = Object.keys(
  categoryType
) as (keyof typeof categoryType)[];

// 👇 Methods
export const axiosError = (message: any) => {
  const error: DeepPartial<AxiosError> = {
    response: { data: message },
  };
  return error;
};

export const axiosData = (data: any) => ({ data });

export const mockIntersectionObserver = () =>
  jest.fn().mockReturnValue({
    observe: () => null,
    unobserve: () => null,
    disconnect: () => null,
  });

export const mockOrders = (empty = false): QueryOrder => ({
  lastKey: {},
  queryResult: empty
    ? []
    : [
        {
          logs: "The bank returned the decline code `insufficient_funds`.",
          location: {
            country: "Japan",
            address: "JA",
          },
          orders: [
            {
              name: "IPhone",
              slot: 1,
              count: 1,
              category: "Phone",
              productId: "productId-1",
              price: 1000,
            },
            {
              name: "Rice",
              slot: 1,
              count: 2,
              category: "Grocery",
              productId: "productId-2",
              price: 2000,
            },
          ],
          status: "PAYMENT FAILED",
          amount: 5000,
          createdAt: 123,
          user: "user",
          intent: "pi_3L0A3bJcU3yoQ34p1mqCo4ee", // Order No: 3120132103
        },
        /* 
        {
          logs: "Payment complete.",
          location: {
            country: "United States",
            address: "US",
          },
          orders: [
            {
              name: "Laptop",
              count: 1,
              slot: 1,
              productId: "productId-3",
              category: "Electronics",
              price: 500,
            },
          ],
          status: "PAYMENT FAILED",
          amount: 500,
          createdAt: 123,
          user: "user",
          intent: "pi_3LPS1wJcU3yoQ34p1AGXoGMM", // Order No: 3121619123
        },
         */
      ],
});

export const urlParams = (url: string) => {
  const params: Partial<QueryParams> & KeyValue = {};
  url
    .substring(url.indexOf("?") + 1)
    .split("&")
    .forEach((item) => {
      params[item.split("=")[0]] = item.split("=")[1];
    });

  return params;
};
