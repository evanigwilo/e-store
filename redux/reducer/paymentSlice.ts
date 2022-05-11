import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { KeyValue, OrderLocation } from "../../utils/types";
import { RootState } from "../store";
import axios from "../../services/axios";
import { authenticationError, rejectError } from "../../utils/helpers";

interface PaymentState {
  error: KeyValue;
  pending: boolean;
  result: { clientSecret: string; amount: number };
}
const initialState: PaymentState = {
  error: {},
  pending: false,
  result: {
    clientSecret: "",
    amount: 0,
  },
};

const paymentSlice = createSlice({
  name: "payment",
  initialState,
  reducers: {
    clearPaymentError: (state) => {
      state.error = initialState.error;
    },
  },
  extraReducers: (builder) => {
    builder
      //
      .addCase(checkoutAsync.pending, (state) => {
        state.pending = true;
      })
      .addCase(checkoutAsync.rejected, (state, action) => {
        const error = action.payload as KeyValue;
        const notKnown = error?.message || error?.name || error?.code;
        const value: KeyValue = {};
        if (error?.name === "NoOrderInCartException")
          value.unknown = "No product in cart.";
        else if (error?.name === "NoOrderException")
          value.unknown = "Cart is empty.";
        else if (error?.name === "InvalidLocationException")
          value.unknown = "Please enter a valid delivery country or address.";
        else value.unknown = notKnown;
        authenticationError(value, error);

        state.error = value;
        state.pending = false;
      })
      .addCase(checkoutAsync.fulfilled, (state, action) => {
        state.error = initialState.error;
        state.result = action.payload;
        state.pending = false;
      });
  },
});

export default paymentSlice.reducer;
export const paymentActions = paymentSlice.actions;
export const selectPayment = (state: RootState) => state.payment;

/* 
  Payment methods
*/
// 👇 Checkout async for completing user payment
export const checkoutAsync = createAsyncThunk(
  "payment/checkout",
  async (props: { location: OrderLocation }, { rejectWithValue }) => {
    try {
      const { location } = props;
      const { data } = await axios.post<typeof initialState.result>(
        "/payment/checkout",
        {
          location,
        }
      );
      return data;
    } catch (error) {
      return rejectWithValue(rejectError(error));
    }
  }
);
