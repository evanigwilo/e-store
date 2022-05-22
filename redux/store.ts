import { combineReducers, configureStore } from "@reduxjs/toolkit";
import thunk from "redux-thunk";
import storage from "redux-persist/lib/storage";
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from "redux-persist";
//import autoMergeLevel2 from "redux-persist/es/stateReconciler/autoMergeLevel2";

import userSlice from "./reducer/userSlice";
import cartSlice from "./reducer/cartSlice";
import paymentSlice from "./reducer/paymentSlice";
import productSlice from "./reducer/productSlice";
import { querySlice } from "./reducer/querySlice";
import usersSlice from "./reducer/usersSlice";

const rootReducer = combineReducers({
  user: userSlice,
  cart: persistReducer(
    {
      key: "cart",
      version: 1,
      storage,
      whitelist: ["cart"],
    },
    cartSlice
  ), //cartSlice,
  payment: paymentSlice,
  product: productSlice,
  users: usersSlice,
  [querySlice.reducerPath]: querySlice.reducer,
});

export const store = configureStore({
  reducer: rootReducer,
  /*
  persistReducer(
    {
      key: "root",
      storage,
      version: 1,
      // stateReconciler: autoMergeLevel2
      whitelist: ["cart"],
    },
    rootReducer
  ),
  */
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
        warnAfter: 128,
      },
      immutableCheck: { warnAfter: 128 },
    })
      .concat(querySlice.middleware)
      .concat(thunk),
});

export const persistor = persistStore(store);
// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
