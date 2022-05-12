import React, { useState } from "react";
import { NextComponentType } from "next";
import { StripeCardElementChangeEvent } from "@stripe/stripe-js";
import { useStripe, useElements, CardElement } from "@stripe/react-stripe-js";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";

import numeral from "numeral";

import { useAppDispatch, useAppSelector } from "../redux/hooks";
import { cartActions } from "../redux/reducer/cartSlice";
import { selectPayment } from "../redux/reducer/paymentSlice";
import { collapseElement, progressButton } from "../utils/helpers";
import InfoToast from "./InfoToast";
import { ToastProp } from "../utils/types";

const Stripe: NextComponentType = () => {
  const dispatch = useAppDispatch();
  const {
    result: { clientSecret, amount },
  } = useAppSelector(selectPayment);
  const { clearCart } = cartActions;
  const stripe = useStripe();
  const elements = useElements();

  const [processing, setProcessing] = useState(false);
  const [succeeded, setSucceeded] = useState(false);
  const [messages, setMessages] = useState<ToastProp[]>([]);
  const [error, setError] = useState("");
  const [disabled, setDisabled] = useState(true);

  // 👉 console.log("Stripe", amount, clientSecret);

  const processPayment = async () => {
    // We don't want to let default form submission happen here,
    // which would refresh the page.

    setError("");

    if (!stripe || !elements) {
      // Stripe.js has not yet loaded.
      // Make sure to disable form submission until Stripe.js has loaded.
      setError("Stripe has not yet loaded.");
      return;
    }
    const card = elements.getElement(CardElement);
    if (!card) {
      setError("Elements not found.");
      return;
    }

    setProcessing(true);

    const { error, paymentIntent } = await stripe.confirmCardPayment(
      clientSecret,
      {
        payment_method: {
          card,
          /*
          billing_details: {
            name: 'Jenny Roses',
          },
        */
        },
      }
    );

    if (error) {
      // 👉 Show error to your customer (for example, insufficient funds)
      setError(`Payment failed: ${error.message}`);
    } else {
      /*
        Show a success message to your customer
        There's a risk of the customer closing the window before callback
        execution. Set up a webhook or plugin to listen for the
        payment_intent.succeeded event that handles any business critical
        post-payment actions.
        */
      dispatch(clearCart());
      setSucceeded(true);
      setMessages([
        {
          message: "Payment succeeded.",
        },
      ]);
    }
    setProcessing(false);
  };

  const handleChange = async (event: StripeCardElementChangeEvent) => {
    // Listen for changes in the CardElement
    // and display any errors as the customer types their card details
    setDisabled(event.empty);
    setError(event.error?.message || "");
  };

  return (
    <>
      <Modal.Header closeButton={!processing}>
        <Modal.Title className="lead fw-normal fs-4 text-dark">
          Card Details
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <CardElement
          onChange={handleChange}
          options={{
            style: {
              base: {
                color: "#32325d",
                fontFamily:
                  'system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,"Noto Sans","Liberation Sans",sans-serif,"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol","Noto Color Emoji"', //'"Helvetica Neue", Helvetica, sans-serif',
                fontSmoothing: "antialiased",
                fontWeight: "500",
                fontSize: "18px",
                "::placeholder": {
                  color: "#aab7c4",
                },
              },
              invalid: {
                color: "#fa755a",
                iconColor: "#fa755a",
              },
            },
          }}
          onReady={() => {
            /*
            // 👉 console.log("CardElement [ready]");
            */
          }}
          onBlur={() => {
            /*
            // 👉 console.log("CardElement [blur]");
            */
          }}
          onFocus={() => {
            /*
            // 👉 console.log("CardElement [focus]");
            */
          }}
        />
      </Modal.Body>
      <Modal.Footer className="justify-content-center fs-5">
        <Button
          onClick={() => processPayment()}
          disabled={!stripe || processing || disabled || succeeded}
          variant="primary"
          className="w-100 css-btn-dark"
        >
          {succeeded ? (
            <div className="fw-bold">
              Payed
              <i className="bi bi-check-lg"></i>
            </div>
          ) : (
            progressButton(
              processing,
              `Pay (${numeral(amount).format("$0,0.00")})`
            )
          )}
        </Button>
        {/* Show any error that happens when processing the payment */}
        {collapseElement(Boolean(error), error, "mt-0")}

        {/* Show a success message upon completion */}
        <InfoToast messages={messages} />
      </Modal.Footer>
    </>
  );
};

export default Stripe;
