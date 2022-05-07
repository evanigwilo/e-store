import { Navbar } from "react-bootstrap";

import { appTitle } from "../utils/constants";
import { AppTitleProps } from "../utils/types";
import styles from "../styles/AppTitle.module.css";

const AppTitle = (props: AppTitleProps) => {
  const { hoverEffect, className } = props;

  // 👉 console.log("AppTitle");

  return (
    <Navbar.Text
      className={`d-inline-block text-secondary py-0 my-auto text-uppercase user-select-none ${
        styles["transform-title"]
      } ${hoverEffect && styles["transform-title-reset"]} ${className}`}
    >
      {appTitle}
    </Navbar.Text>
  );
};

export default AppTitle;
