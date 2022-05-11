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

import userSlice from "./reducer/userSlice";
import cartSlice from "./reducer/cartSlice";
import paymentSlice from "./reducer/paymentSlice";

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
    }).concat(thunk),
});

export const persistor = persistStore(store);
// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
