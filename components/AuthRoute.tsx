import React, { useState, useEffect } from "react";
import { NextComponentType } from "next";
import { useRouter } from "next/router";

import { useAppSelector } from "../redux/hooks";
import { selectUser } from "../redux/reducer/userSlice";
import { ToastProp } from "../utils/types";
import InfoToast from "./InfoToast";

const AuthRoute: NextComponentType = () => {
  const {
    initials: { authenticated, pending },
  } = useAppSelector(selectUser);
  const router = useRouter();
  const [messages, setMessages] = useState<ToastProp[]>([]);

  const resetRoute = () => {
    const newUrl = "/";
    window.history.replaceState(
      { ...window.history.state, as: newUrl, url: newUrl },
      "",
      newUrl
    );
    // 👇 Below, Re-renders whole app
    /*
        router.replace("/", undefined, { shallow: true });
    */
  };
  const setMessage = (message: string) =>
    setMessages([
      {
        message,
        onClose: () => resetRoute(),
      },
    ]);

  useEffect(() => {
    if (pending) {
      return;
    }
    const { logged, verified, unauthorized } = router.query;

    if (authenticated) {
      if (logged !== undefined) {
        setMessage("You are already signed in!");
      } else if (verified !== undefined) {
        setMessage("You are already verified!");
      } else if (unauthorized !== undefined) {
        setMessage("You are not authorized to perform this action.");
      }
    } else {
      resetRoute();
    }
  }, [router, pending]);

  // 👉 console.log("AuthRoute");

  return <InfoToast messages={messages} />;
};

export default AuthRoute;
