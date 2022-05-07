import { NextComponentType, NextPageContext } from "next";

import Modal from "react-bootstrap/Modal";
import Spinner from "react-bootstrap/Spinner";

const Loader: NextComponentType<
  NextPageContext,
  {},
  {
    show: boolean;
  }
> = (props) => {
  const { show } = props;

  // 👉 console.log("Loader");

  return (
    <Modal
      show={show}
      backdrop="static"
      keyboard={false}
      centered
      contentClassName="bg-transparent text-white css-content-center border-0"
    >
      <Modal.Body>
        <Spinner animation="grow" />
      </Modal.Body>
    </Modal>
  );
};

export default Loader;
