import { memo } from "react";
import Image from "next/image";

import Modal from "react-bootstrap/Modal";
import Form from "react-bootstrap/Form";

import { ImagePreviewProps } from "../utils/types";
import { Progress } from "../utils/helpers";
import styles from "../styles/ImagePreview.module.css";

const ImagePreview = (props: ImagePreviewProps) => {
  const { src, closeButton, htmlFor, htmlForProgress, show, setShow } = props;

  // 👉 console.log("ImagePreview");

  return (
    <Modal
      show={Boolean(show)}
      fullscreen
      centered
      className={styles["modal-transparent"]}
      onHide={() => setShow(0)}
    >
      <Modal.Header className="border-0 text-light" closeButton={closeButton}>
        <Modal.Title className="m-0 lead fs-4">
          {htmlFor && (
            <Form.Label role="button" htmlFor={htmlFor}>
              {htmlForProgress ? (
                Progress()
              ) : (
                <>
                  <i className="bi bi-cloud-upload pe-2 align-text-top "></i>
                  <span className="css-mouse-enter d-inline-block">Upload</span>
                </>
              )}
            </Form.Label>
          )}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="m-4 mt-0">
        {show && (
          <Image src={src} alt="No Image" objectFit="contain" layout="fill" />
        )}
      </Modal.Body>
    </Modal>
  );
};

export default memo(ImagePreview);
