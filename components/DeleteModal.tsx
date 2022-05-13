import { memo } from "react";

import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";

import { DeleteModalProps } from "../utils/types";
import { darkOpacityText } from "../utils/constants";
import { collapseElement, progressButton } from "../utils/helpers";
import styles from "../styles/DeleteModal.module.css";

const DeleteModal = (props: DeleteModalProps) => {
  const { onClickDelete, onExit, loading, message, error, show, setShow } =
    props;

  // 👉 console.log("DeleteModal");

  return (
    <Modal
      show={show}
      onHide={() => setShow(false)}
      onExit={() => onExit && onExit()}
      backdrop="static"
      keyboard={false}
      contentClassName="top-50 px-2"
      className={`${darkOpacityText} ${styles["modal-delete"]}`}
      scrollable
    >
      <Modal.Header className="border-0 pb-0 pt-3" closeButton={!loading}>
        <Modal.Title>
          <i className="bi bi-exclamation-circle fs-1 text-danger"></i>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="h6 mb-0 py-2">
        <span>{message}</span>
        {collapseElement(Boolean(error), error)}
      </Modal.Body>
      <Modal.Footer className="border-0 mb-1">
        <Button
          className="me-2"
          disabled={loading}
          variant="outline-secondary"
          onClick={() => setShow(false)}
        >
          Close
        </Button>
        <Button
          variant="danger"
          disabled={loading}
          onClick={() => onClickDelete && onClickDelete()}
        >
          {progressButton(loading, "Understood")}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default memo(DeleteModal);
