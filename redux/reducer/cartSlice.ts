import {
  createAsyncThunk,
  createEntityAdapter,
  createSelector,
  createSlice,
} from "@reduxjs/toolkit";
import { PURGE } from "redux-persist";
import axios from "../../services/axios";
import {
  KeyValue,
  Order,
  Orders,
  OrderOrders,
  Product,
  Selector,
} from "../../utils/types";
import { RootState } from "../store";

const cartAdapter = createEntityAdapter<OrderOrders>({
  selectId: (order) => order.productId,
});
const cartState = cartAdapter.getInitialState<Partial<Order>>({});

interface CartState {
  pending: {
    get: boolean;
    cart: {
      update: KeyValue<boolean>;
      remove: KeyValue<boolean>;
    };
  };
  cart: Partial<Order>;
  order: typeof cartState;
}
const initialState: CartState = {
  pending: {
    get: false,
    cart: {
      update: {},
      remove: {},
    },
  },
  cart: {},
  order: cartState,
};

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    clearCart: (state) => {
      cartAdapter.removeAll(state.order);
      state.cart = initialState.cart;
    },
  },
  extraReducers: (builder) => {
    builder
      // 👉 Purge any persisted state
      .addCase(PURGE, () => initialState)
      //
      .addCase(getCartAsync.pending, (state) => {
        state.pending.get = true;
      })
      .addCase(getCartAsync.fulfilled, (state, action) => {
        state.cart = action.payload;
        const { orders } = action.payload;
        if (orders) {
          state.order = cartAdapter.setAll(state.order, orders);
        }
        state.pending.get = false;
      })
      //
      .addCase(cartUpdateAsync.pending, (state, action) => {
        const { productId } = action.meta.arg;
        state.pending.cart.update[productId] = true;
      })
      .addCase(cartUpdateAsync.fulfilled, (state, action) => {
        const { productId } = action.meta.arg;
        state.pending.cart.update[productId] = false;
        state.cart = action.payload;

        const { orders } = action.payload;
        if (orders) {
          state.order = cartAdapter.setAll(state.order, orders);
        }
      })
      //
      .addCase(cartRemoveAsync.pending, (state, action) => {
        const { productId } = action.meta.arg;
        state.pending.cart.remove[productId] = true;
      })
      .addCase(cartRemoveAsync.fulfilled, (state, action) => {
        const { productId } = action.meta.arg;
        state.pending.cart.remove[productId] = false;
        state.cart = action.payload;

        const { orders } = action.payload;
        if (orders) {
          state.order = cartAdapter.setAll(state.order, orders);
        }
      });
  },
});

export default cartSlice.reducer;
export const cartActions = cartSlice.actions;
export const selectCart = (state: RootState) => state.cart;

// 👉 Export the customized selectors for this adapter using `getSelectors`
export const selectQueryCart = cartAdapter.getSelectors<RootState>(
  (state) => state.cart.order
);
export const selectCartCount = (productId: string): Selector<number> =>
  createSelector(
    [(state: RootState) => selectQueryCart.selectById(state, productId)],
    (orders) => orders?.count || 0
  );

/* 
  Cart methods
*/
// 👇 GetCart async action for getting users cart including from persist storage
export const getCartAsync = createAsyncThunk(
  "cart/get",
  async (_, { getState }) => {
    const {
      cart: { cart },
      user: {
        initials: { authenticated },
      },
    } = getState() as RootState;
    try {
      const newCart: Orders[] = [];
      cart.orders?.forEach(({ productId, count }) => {
        newCart.push({
          productId,
          count,
        });
      });

      if (!authenticated) {
        throw new Error("Return Cart");
      }
      const { data } = await axios.post<Order>("/order/cart", newCart);
      return data;
    } catch (error) {
      return cart;
    }
  }
);
// 👇 CartUpdate async action for updating cart items
export const cartUpdateAsync = createAsyncThunk(
  "cart/update",
  async (
    props: {
      order: Orders;
      productId: string;
      product?: Product;
      slot?: number;
    },
    { getState }
  ) => {
    const {
      cart: { cart },
      user: {
        initials: { authenticated },
      },
    } = getState() as RootState;
    const { order, product, slot } = props;
    const newCart: Orders[] = [];
    const newOrder: OrderOrders[] = [];

    let amount = 0;
    let add = true;
    cart.orders?.forEach(({ productId, price, count }, index) => {
      const found = productId === order.productId;
      if (add && found) {
        add = false;
      }
      const newCount = found ? order.count : count;
      amount += newCount * price;
      newCart.push({
        productId,
        count: newCount,
      });
      newOrder.push({
        ...cart.orders![index],
        count: newCount,
      });
    });

    if (add) {
      newCart.push(order);
      const { id: productId, category, price, name } = product!;
      newOrder.push({
        category,
        name,
        price,
        productId,
        slot: slot!,
        count: order.count,
      });
      amount += order.count * price;
    }

    try {
      if (!authenticated) {
        throw new Error("Update Cart");
      }
      const { data } = await axios.post<Order>("/order/create", newCart);
      return data;
    } catch (error) {
      return {
        ...cart,
        amount,
        orders: newOrder,
      };
    }
  }
);
// 👇 CartRemove async action for removing cart items
export const cartRemoveAsync = createAsyncThunk(
  "cart/remove",
  async (props: { productId: string }, { getState }) => {
    const {
      cart: { cart },
      user: {
        initials: { authenticated },
      },
    } = getState() as RootState;
    const { productId } = props;
    const newCart: Orders[] = [];
    const newOrder: OrderOrders[] = [];

    let amount = 0;
    cart.orders?.forEach((order) => {
      if (order.productId !== productId) {
        amount += order.count * order.price;
        newOrder.push(order);
        newCart.push({
          productId: order.productId,
          count: order.count,
        });
      }
    });

    try {
      if (!authenticated) {
        throw new Error("Save Cart");
      }
      const { data } = await axios.post<Order>("/order/create", newCart);

      return data;
    } catch (error) {
      return {
        ...cart,
        amount,
        orders: newOrder,
      };
    }
  }
);
