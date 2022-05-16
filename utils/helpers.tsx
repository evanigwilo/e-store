import { IncomingMessage } from "http";
import { AxiosError, AxiosRequestConfig } from "axios";
import { SetStateAction } from "react";
import { SerializedError } from "@reduxjs/toolkit";
import { FetchBaseQueryError } from "@reduxjs/toolkit/dist/query";

import Collapse from "react-bootstrap/Collapse";
import Spinner from "react-bootstrap/Spinner";
import Form from "react-bootstrap/Form";

import axios from "../services/axios";
import { AuthenticatedResult, KeyValue, Product, QueryParams } from "./types";
import { debounceId, statusStyle } from "./constants";

// 👇 check user authentication status
export const isUserAuthenticated = async (
  req?: IncomingMessage
): Promise<false | AuthenticatedResult> => {
  if (req) {
    if (!req.headers.cookie) return false;
  }

  const config: AxiosRequestConfig | undefined = req
    ? {
        headers: {
          Cookie: req.headers.cookie!, //req.cookies;,
        },
      }
    : undefined;

  try {
    // 👇 is user authenticated ?
    const { data } = await axios.get<AuthenticatedResult>("/auth", config);
    return data;
  } catch (error) {
    try {
      // 👇 try get new tokens if refresh token is valid
      const { data } = await axios.post<AuthenticatedResult>(
        "/refresh",
        undefined,
        config
      );
      return data;
    } catch (error) {
      return false;
    }
  }
};

// 👇 format error message if it relates to authentication
export const authenticationError = (value: KeyValue, error: KeyValue) => {
  if (
    error?.name === "NotAuthorizedException" ||
    error?.message === "Forbidden"
  )
    value.unknown = "You are not authorized to perform this action.";
};

// 👇 format axios error message
export const rejectError = (error: unknown) => {
  const response = (error as AxiosError).response;
  return response?.data as KeyValue;
};

export const Progress = (size?: "sm") => (
  <Spinner
    animation="border"
    size={size}
    style={{
      borderWidth: "0.1em",
      cursor: "progress",
    }}
    className="align-middle"
  />
);

export const progressButton = (
  pending: boolean,
  text: string
): JSX.Element | string => (pending ? Progress("sm") : text);

// 👇 random backdrops
export const flipRandomly = () => {
  const number = Math.floor(Math.random() * 100);
  return "flip-" + Math.floor(number * (12 / 100));
};

export const collapseElement = (
  open?: boolean,
  message?: string,
  margin = "mt-2"
) => (
  <Collapse in={open}>
    <div>
      <Form.Text className={`${margin} text-danger d-block`}>
        <span className="d-flex">
          <i className="bi bi-exclamation-triangle-fill me-1"></i>
          {message}
        </span>
      </Form.Text>
    </div>
  </Collapse>
);

export const getImageUrl = (id: string, slot: number, randomTime: number) =>
  `https://${process.env.NEXT_PUBLIC_S3_BUCKET_NAME}.s3.amazonaws.com/` +
  id +
  "/" +
  slot +
  "?" +
  randomTime; // 👉 to trigger image reload

// 👇 debounce() function to forces a function to wait a certain amount of time before running again
export const debounce = (
  id: "UPDATE_TOTAL" | "FIND_PRODUCT",
  callback: () => void,
  delay: number = 500
) => {
  debounceId[id] = debounceId[id] || {
    timeout: undefined,
    delay,
  };

  const getID = debounceId[id];

  // clear the timeout
  getID.timeout && clearTimeout(getID.timeout);
  // start timing for event "completion"
  getID.timeout = setTimeout(() => callback(), getID.delay);
};

export const reduceToValue = <V extends unknown>(
  collection: Array<string | number>,
  value: () => V
) =>
  collection.reduce((previousValue, currentValue) => {
    previousValue[currentValue] = value();
    return previousValue;
  }, {} as { [key: string]: V });

export const editImage = (
  product: Partial<Product> | KeyValue<boolean>,
  slot: string,
  action: "ADD" | "REMOVE"
) => {
  (product as KeyValue<boolean>)["image_" + slot] = action === "ADD";
};

// 👇 function to check if the product has image with the specified slot
export const hasImage = (
  product: Partial<Product> | KeyValue<boolean>,
  slot: number
) => Boolean((product as KeyValue<boolean>)["image_" + slot]);

// 👇 function to trigger fetching more data
export const nextPage = (
  error: FetchBaseQueryError | SerializedError | undefined,
  lastKey: KeyValue<KeyValue<string>> | undefined,
  inViewOrLoading: boolean,
  setQueryParams: (value: SetStateAction<QueryParams>) => void
) => {
  if (inViewOrLoading || !lastKey || error) {
    return;
  }
  setQueryParams((prev) => ({
    ...prev,
    body: lastKey,
    page: prev.page + 1,
  }));
};

// 👇 function to trigger fetching more data when user scrolls to end of page
export const inViewStatus = (
  ref: (node?: Element | null) => void,
  loading: boolean,
  items: boolean,
  text: string,
  error?: FetchBaseQueryError | SerializedError,
  custom?: string
) => (
  <div ref={ref} className={statusStyle}>
    {loading ? (
      Progress()
    ) : (
      <span className={error && "text-danger"}>
        {custom ||
          (error
            ? `Error: ${(error as KeyValue).unknown}`
            : `${items ? `No more ${text}s` : `No ${text}`}`)}
      </span>
    )}
  </div>
);
