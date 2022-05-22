import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { userGroups } from "utils/constants";
import axios from "../../services/axios";
import { authenticationError, rejectError } from "../../utils/helpers";
import { KeyValue, User } from "../../utils/types";
import { RootState } from "../store";

interface UsersState {
  error: {
    get: KeyValue;
    update: KeyValue;
  };
  pending: {
    get: boolean;
    update: boolean;
  };
  result: {
    get: User[];
    update: {
      username: string;
      group: keyof typeof userGroups;
    };
  };
}
const initialState: UsersState = {
  error: { get: {}, update: {} },
  pending: {
    get: false,
    update: false,
  },
  result: {
    get: [],
    update: {
      username: "",
      group: "",
    },
  },
};

const usersSlice = createSlice({
  name: "users",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = initialState.error;
    },
  },
  extraReducers: (builder) => {
    builder
      //
      .addCase(getUsersAsync.pending, (state) => {
        state.result.update = initialState.result.update;
        state.pending.get = true;
      })
      .addCase(getUsersAsync.rejected, (state, action) => {
        const error = action.payload as KeyValue;
        const notKnown = error?.message || error?.name || error?.code;
        const value = { unknown: notKnown };
        authenticationError(value, error);
        state.error.get = value;
        state.pending.get = false;
      })
      .addCase(getUsersAsync.fulfilled, (state, action) => {
        state.result.get = action.payload;
        state.error.get = initialState.error.get;
        state.pending.get = false;
      })
      //
      .addCase(addToGroupAsync.pending, (state) => {
        state.pending.update = true;
      })
      .addCase(addToGroupAsync.rejected, (state, action) => {
        const error = action.payload as KeyValue;
        const notKnown = error?.message || error?.name || error?.code;
        const value: KeyValue = {};
        if (error?.name === "EmptyGroupException")
          value.unknown = "Group not specified.";
        else if (error?.name === "EmptyUsernameException")
          value.unknown = "Username not specified.";
        else value.unknown = notKnown;
        authenticationError(value, error);
        state.error.update = value;
        state.pending.update = false;
      })
      .addCase(addToGroupAsync.fulfilled, (state, action) => {
        state.result.update =
          action.payload as typeof initialState.result.update;
        state.error.update = initialState.error.update;
        state.pending.update = false;
      })
      //
      .addCase(removeFromGroupAsync.pending, (state) => {
        state.pending.update = true;
      })
      .addCase(removeFromGroupAsync.rejected, (state, action) => {
        const error = action.payload as KeyValue;
        const notKnown = error?.message || error?.name || error?.code;
        const value: KeyValue = {};
        if (error?.name === "EmptyGroupException")
          value.unknown = "Group not specified.";
        else if (error?.name === "EmptyUsernameException")
          value.unknown = "Username not specified.";
        else value.unknown = notKnown;
        authenticationError(value, error);
        state.error.update = value;
        state.pending.update = false;
      })
      .addCase(removeFromGroupAsync.fulfilled, (state, action) => {
        state.result.update =
          action.payload as typeof initialState.result.update;
        state.error.update = initialState.error.update;
        state.pending.update = false;
      });
  },
});

export default usersSlice.reducer;
export const usersActions = usersSlice.actions;
export const selectUsers = (state: RootState) => state.users;

/* 
  Users methods
*/
// 👇 Users add and remove function
const addRemoveCreator = async (
  props: { group: string; username: string },
  method: "POST" | "DELETE",
  rejectWithValue: (value: unknown) => unknown
): Promise<typeof initialState.result.update | KeyValue> => {
  try {
    const { group, username } = props;
    const { data } =
      method === "POST"
        ? await axios.post<typeof initialState.result.update>(
            "/user-group/" + group,
            undefined,
            {
              params: { username },
            }
          )
        : await axios.delete<typeof initialState.result.update>(
            "/user-group/" + group,
            {
              params: { username },
            }
          );

    return data;
  } catch (error) {
    return rejectWithValue(rejectError(error)) as KeyValue;
  }
};
// 👇 GetUsers async action for getting users
export const getUsersAsync = createAsyncThunk(
  "users/get",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axios.get<User[]>("/users");
      return data;
    } catch (error) {
      return rejectWithValue(rejectError(error));
    }
  }
);
// 👇 AddToGroup async action for adding users to group
export const addToGroupAsync = createAsyncThunk(
  "users/addToGroup",
  async (props: { group: string; username: string }, { rejectWithValue }) =>
    addRemoveCreator(props, "POST", rejectWithValue)
);
// 👇 RemoveFromGroup async action for removing users from group
export const removeFromGroupAsync = createAsyncThunk(
  "users/removeFromGroup",
  async (props: { group: string; username: string }, { rejectWithValue }) =>
    addRemoveCreator(props, "DELETE", rejectWithValue)
);
