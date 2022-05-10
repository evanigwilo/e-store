import { useEffect, useRef } from "react";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";

import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";

import { store, persistor } from "./store";
import { userActions } from "./reducer/userSlice";
import { isUserAuthenticated } from "../utils/helpers";
import { Props } from "../utils/types";

export default function ({ children }: Props) {
  // 👇 check user authentication on every first load
  useEffect(() => {
    const { dispatch } = store;
    const { authenticating, authenticated } = userActions;
    dispatch(authenticating());
    isUserAuthenticated().then((result) => dispatch(authenticated(result)));
  }, []);

  /*  👇 
  Make sure to call `loadStripe` outside of a component’s render to avoid
  recreating the `Stripe` object on every render.
  */
  const { current: stripePromise } = useRef(
    loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
  );

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <Elements stripe={stripePromise}>{children}</Elements>
      </PersistGate>
    </Provider>
  );
}
