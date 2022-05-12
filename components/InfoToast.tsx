import React, { useState, useEffect, memo } from "react";

import Toast from "react-bootstrap/Toast";
import ToastContainer from "react-bootstrap/ToastContainer";

import { ToastMessages } from "../utils/types";

const InfoToast = (props: ToastMessages) => {
  const { messages } = props;
  const [showToast, setShowToast] = useState(messages.map(() => true));

  useEffect(() => {
    setShowToast(messages.map(() => true));
  }, [messages]);

  // 👉 console.log("InfoToast");

  return (
    <ToastContainer
      containerPosition="fixed"
      className="p-2 css-z-index-toast"
      position="top-center"
    >
      {messages.map(({ message, onClose, delay }, index) => (
        <Toast
          key={index}
          bg="light"
          delay={delay || 5000}
          show={showToast[index]}
          autohide
          onClose={() => {
            setShowToast((prev) => {
              prev[index] = false;
              return [...prev];
            });
            onClose && onClose();
          }}
          className="border-5 border-start border-0 border-info"
        >
          <Toast.Header className="fs-6 display-5 justify-content-between">
            <div>
              <i className="bi bi-info-circle me-2 text-info"></i>
              <strong className="me-auto">Info</strong>
            </div>
          </Toast.Header>
          <Toast.Body>{message}</Toast.Body>
        </Toast>
      ))}
    </ToastContainer>
  );
};

export default memo(InfoToast);
