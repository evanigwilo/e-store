import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";

import { Props } from "../utils/types";
import { flipRandomly } from "../utils/helpers";
import AppBar from "./AppBar";
import styles from "../styles/BackDrop.module.css";

const BackDrop = ({ children }: Props) => {
  const { pathname } = useRouter();

  const root = useRef<HTMLElement | null>();
  const { current: noClip } = useRef([
    "/",
    "/users",
    "/products",
    "/cart",
    "/orders",
    "/category/[category]",
  ]);
  const { current: noAppbar } = useRef(["/register", "/login", "/verify"]);
  const { current: absoluteBody } = useRef([
    "/cart",
    "/orders",
    "/category/[category]",
  ]);

  const [flip, setFlip] = useState<string[]>([]);

  useEffect(() => {
    if (!root.current) {
      root.current = document.querySelector(":root") as HTMLElement;
    } else {
      const style = root.current.style;
      if (absoluteBody.includes(pathname)) {
        style.setProperty("--position", "absolute");
        style.setProperty("--overflow", "hidden");
      } else {
        style.setProperty("--position", "unset");
        style.setProperty("--overflow", "unset");
      }
    }

    setFlip(Array.from({ length: 2 }, () => flipRandomly()));
  }, [pathname]);

  // 👉 console.log("BackDrop");

  return (
    <>
      {noClip.includes(pathname) ? (
        <div className={styles["animate-colors"]}></div>
      ) : (
        Array.from({ length: flip.length }, (_, idx) => {
          return (
            <div key={idx}>
              <div className={`${styles["clip-1"]} ${styles[flip[idx]]}`}></div>
              <div className={`${styles["clip-2"]} ${styles[flip[idx]]}`}></div>
              <div className={`${styles["clip-3"]} ${styles[flip[idx]]}`}></div>
            </div>
          );
        })
      )}

      {!noAppbar.includes(pathname) && <AppBar />}

      {children}
    </>
  );
};

export default BackDrop;
