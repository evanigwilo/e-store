import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "../../services/axios";
import { CountryType, CountryResult, KeyValue } from "../../utils/types";
import { AuthenticatedResult } from "../../utils/types";
import { authenticationError, rejectError } from "../../utils/helpers";
import { RootState } from "../store";

interface UserState {
  error: KeyValue;
  initials: Partial<AuthenticatedResult> & {
    pending: boolean;
    authenticated: boolean;
  };
  country: {
    fetched: boolean;
    supported: CountryType[];
    deliver: {
      code: string;
      emoji: string;
    };
  };
}
const initialState: UserState = {
  error: {},
  initials: {
    pending: false,
    authenticated: false,
    admin: false,
    emailVerified: false,
    manageProducts: false,
  },
  country: {
    fetched: false,
    supported: [],
    deliver: {
      code: "...",
      emoji: "",
    },
  },
};
const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    restore: () => initialState,
    clearError: (state) => {
      state.error = initialState.error;
    },
    authenticating: (state) => {
      state.initials.pending = true;
    },
    authenticated: (state, action) => {
      if (action.payload !== false) {
        const payload = action.payload as AuthenticatedResult;
        state.initials = {
          ...payload,
          pending: false,
          authenticated: true,
        };
      } else {
        state.initials = {
          pending: false,
          authenticated: false,
        };
      }
    },
    countryPreferred: (state, action) => {
      const country = action.payload as typeof state.country.deliver;
      state.country.deliver = country;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginAsync.pending, (state) => {
        state.initials.pending = true;
      })
      .addCase(loginAsync.rejected, (state, action) => {
        const error = action.payload as KeyValue;
        const notKnown = error?.message || error?.name || error?.code;
        const value: KeyValue =
          error?.name === "UserNotFoundException"
            ? { identity: "Username or Email not found." }
            : error?.name === "UsernameOrEmailInvalidException"
            ? { identity: "Username or Email is not valid." }
            : error?.name === "PasswordInvalidException"
            ? { password: "Password is not valid." }
            : { unknown: notKnown };
        authenticationError(value, error);

        state.error =
          error?.name === "NotAuthorizedException"
            ? { password: "Incorrect password." }
            : value;
        state.initials.pending = false;
      })
      .addCase(loginAsync.fulfilled, (state, action) => {
        state.initials = {
          ...action.payload,
          pending: false,
          authenticated: true,
        };
      })
      .addCase(registerAsync.pending, (state) => {
        state.initials.pending = true;
      })
      .addCase(registerAsync.rejected, (state, action) => {
        const error = action.payload as KeyValue;
        const notKnown = error?.message || error?.name || error?.code;
        const value: KeyValue =
          error?.name === "EmailExistsException"
            ? { email: "Email already exists." }
            : error?.name === "UsernameExistsException"
            ? { username: "Username already exists." }
            : { unknown: notKnown };
        authenticationError(value, error);

        state.error = value;
        state.initials.pending = false;
      })
      .addCase(registerAsync.fulfilled, (state, action) => {
        state.initials = {
          ...action.payload,
          pending: false,
          authenticated: true,
        };
      })
      .addCase(verifyAsync.pending, (state) => {
        state.initials.pending = true;
      })
      .addCase(verifyAsync.rejected, (state, action) => {
        const error = action.payload as KeyValue;
        const notKnown = error?.message || error?.name || error?.code;
        const value: KeyValue = {};
        if (error?.name === "CodeMismatchException")
          value.unknown =
            "Provided code doesn't match what the server was expecting.";
        else value.unknown = notKnown;
        authenticationError(value, error);

        state.error = value;
        state.initials.pending = false;
      })
      .addCase(verifyAsync.fulfilled, (state, { meta }) => {
        const method = meta.arg.method;
        if (method === "VERIFY") {
          state.initials.emailVerified = true;
        }
        state.initials.pending = false;
      })
      .addCase(locationAsync.fulfilled, (state, action) => {
        const { country, countries } = action.payload;
        state.country.supported = countries;
        state.country.deliver = {
          code: countries[0].code,
          emoji: countries[0].emoji,
        };
        countries.some(({ code, emoji }) => {
          if (code === country) {
            state.country.deliver = { code, emoji };
            return true;
          }
        });
        state.country.fetched = true;
      });
  },
});

export default userSlice.reducer;
export const userActions = userSlice.actions;
export const selectUser = (state: RootState) => state.user;

// 👇 Login async action for user login
export const loginAsync = createAsyncThunk(
  "user/login",
  async (
    props: { identity: string; password: string },
    { rejectWithValue }
  ) => {
    try {
      const { data } = await axios.post<AuthenticatedResult>("/login", props);
      // The value we return becomes the `fulfilled` action payload
      return data;
    } catch (error) {
      return rejectWithValue(rejectError(error));
    }
  }
);
// 👇 Register async action for user registration
export const registerAsync = createAsyncThunk(
  "user/register",
  async (
    props: {
      email: string;
      username: string;
      gender: string;
      password: string;
    },
    { rejectWithValue }
  ) => {
    try {
      const { data } = await axios.post<AuthenticatedResult>(
        "/register",
        props
      );
      // The value we return becomes the `fulfilled` action payload
      return data;
    } catch (error) {
      return rejectWithValue(rejectError(error));
    }
  }
);
// 👇 Verify async action for user verification
export const verifyAsync = createAsyncThunk(
  "user/verify",
  async (
    props: { method: "SEND" | "VERIFY"; code?: string },
    { rejectWithValue }
  ) => {
    const { code } = props;
    try {
      await axios.post("/verify", undefined, {
        params: { code },
      });
      return;
    } catch (error) {
      return rejectWithValue(rejectError(error));
    }
  }
);
// 👇 Location async action for getting user location and supported countries
export const locationAsync = createAsyncThunk(
  "user/location",
  async (_, { rejectWithValue, getState }) => {
    try {
      const { user } = getState() as RootState;

      if (user.country.fetched) {
        const result: CountryResult = {
          country: user.country.deliver.code,
          countries: user.country.supported,
        };
        return result;
      }
      const { data: countries } = await axios.get<CountryType[]>("/country");

      const {
        data: { country },
      } = await axios.get<{ country: string }>("https://ipapi.co/json/", {
        withCredentials: false,
      });

      const result: CountryResult = {
        country,
        countries,
      };
      return result;
    } catch (error) {
      return rejectWithValue(rejectError(error));
    }
  }
);
