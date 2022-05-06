import { IncomingMessage } from "http";
import { AxiosError, AxiosRequestConfig } from "axios";

import axios from "../services/axios";
import { AuthenticatedResult, KeyValue } from "./types";

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
