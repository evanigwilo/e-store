// 👇 React modules
import { useRef, useEffect, useState } from "react";
// 👇 Next.js modules
import { NextPage } from "next";
import Head from "next/head";
// 👇 React-Bootstrap modules
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import Container from "react-bootstrap/Container";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import ListGroup from "react-bootstrap/ListGroup";
import Collapse from "react-bootstrap/Collapse";
import Form from "react-bootstrap/Form";
import Dropdown from "react-bootstrap/Dropdown";
import Modal from "react-bootstrap/Modal";
// 👇 Numeral module
import numeral from "numeral";
// 👇 React Intersection Observer module
import { useInView } from "react-intersection-observer";
// 👇 Custom modules
import { appTitle, darkOpacityText, statusStyle } from "../utils/constants";
import {
  collapseElement,
  isUserAuthenticated,
  Progress,
  progressButton,
} from "../utils/helpers";
import CartItem from "../components/CartItem";
import { useAppDispatch, useAppSelector } from "../redux/hooks";
import { selectUser, userActions } from "../redux/reducer/userSlice";
import { selectCart } from "../redux/reducer/cartSlice";
import {
  checkoutAsync,
  paymentActions,
  selectPayment,
} from "../redux/reducer/paymentSlice";
import Stripe from "../components/Stripe";

const Cart: NextPage = () => {
  const [openLocation, setOpenLocation] = useState(false);
  const [stripeModal, setStripeModal] = useState(false);
  const [address, setAddress] = useState("");
  const { ref, inView } = useInView({
    initialInView: true,
  });
  const appBar = useRef<HTMLElement | null>();
  const checkout = useRef<HTMLButtonElement | null>(null);

  const dispatch = useAppDispatch();
  const {
    country: { supported, deliver },
    initials: { pending: initialsPending },
  } = useAppSelector(selectUser);
  const {
    pending: { get: getPending, cart: cartPending },
    cart: { orders, amount },
  } = useAppSelector(selectCart);
  const { countryPreferred, authenticating, authenticated } = userActions;

  const { pending: checkoutPending, error: checkoutError } =
    useAppSelector(selectPayment);
  const { clearPaymentError } = paymentActions;

  const subTotal = numeral(amount).format("$0,0.[00]");
  const checkoutText = "Proceed to checkout";
  const appBarHeight = appBar.current?.clientHeight;

  useEffect(() => {
    // 👇 appBar element reference for its height
    appBar.current = document.getElementById("appbar");
    dispatch(clearPaymentError());
  }, []);

  useEffect(() => {
    if (!checkout.current) {
      return;
    }
    // 👇 show amount with checkout button on scroll on smaller screens
    checkout.current.innerText = inView
      ? checkoutText
      : `${checkoutText} (${subTotal})`;
  }, [inView, amount]);

  // 👉 console.log("Cart");

  return (
    <div>
      <Head>
        <title>{`${appTitle} | Cart`}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <Container fluid="lg" className={darkOpacityText}>
        <Row
          style={{
            height: `calc(100vh - ${appBarHeight}px)`,
            gridTemplateRows: "auto 1fr",
          }}
          className="p-2 overflow-auto border-0 d-grid gap-3 gap-md-0 d-md-flex flex-md-row-reverse"
        >
          <Col
            md={4}
            style={{
              top: `calc(-${appBarHeight}px)`,
            }}
            className={`css-z-index-dropdown ${
              !openLocation && "position-sticky"
            } p-0 h-0 ps-md-3`}
          >
            <div ref={ref} className="w-100 position-absolute"></div>
            <Card className="shadow-sm">
              <Card.Body>
                <Card.Title className="mb-0 text-secondary">
                  <span className="fs-5 fw-light">{"Subtotal: "}</span>
                  {subTotal}
                  <hr style={{ height: "2px" }} />
                </Card.Title>
                <Card.Text className="mb-2 d-none d-md-flex">
                  <i className="bi bi-info-circle me-1 text-warning"></i>
                  Delivery fees not included.
                </Card.Text>
                <Button
                  ref={checkout}
                  disabled={
                    initialsPending ||
                    checkoutPending ||
                    getPending ||
                    !Boolean(orders?.length)
                  }
                  className="w-100 my-2 css-btn-dark"
                  onClick={() => {
                    dispatch(clearPaymentError());
                    setOpenLocation(true);
                  }}
                >
                  {checkoutText}
                </Button>
              </Card.Body>
            </Card>

            {/* Location input */}
            <Collapse in={openLocation && Boolean(orders?.length)}>
              <div
                data-testid="form-location"
                className="m-2 mb-3 p-3 bg-white rounded-3 fs-6"
              >
                <Form
                  noValidate
                  onSubmit={(e) => {
                    e.preventDefault();
                    dispatch(clearPaymentError());
                    dispatch(authenticating());
                    isUserAuthenticated().then((result) => {
                      dispatch(authenticated(result));
                      dispatch(
                        checkoutAsync({
                          location: {
                            address,
                            country: supported.find(
                              (country) => country.code === deliver.code
                            )!.name,
                          },
                        })
                      )
                        .unwrap()
                        .then(() => setStripeModal(true))
                        .catch(() => null);
                    });
                  }}
                >
                  <Form.Group controlId="formCheckoutCountry">
                    <Form.Label className="mt-2">Country</Form.Label>
                    <Dropdown>
                      <Dropdown.Toggle
                        disabled={checkoutPending}
                        id="formCheckoutCountry"
                        style={{ borderBottom: "2px solid var(--bs-gray-100)" }}
                        className="css-form-input-color text-start w-100 css-hide-drop"
                      >
                        {`Deliver to ${deliver.code} ${deliver.emoji}`}
                        <i className="bi bi-chevron-expand position-absolute top-50 end-0 translate-middle-y pe-2"></i>
                      </Dropdown.Toggle>
                      <Dropdown.Menu
                        style={
                          {
                            // marginTop: "-2px",
                          }
                        }
                        className="w-100"
                      >
                        {supported.map((country) => (
                          <Dropdown.Item
                            key={country.code}
                            active={country.code === deliver.code}
                            onClick={() => dispatch(countryPreferred(country))}
                            className="text-body"
                          >
                            {country.emoji + " " + country.name}
                          </Dropdown.Item>
                        ))}
                      </Dropdown.Menu>
                    </Dropdown>
                  </Form.Group>

                  <Form.Group controlId="formCheckoutAddress">
                    <Form.Label className="mt-4">Address</Form.Label>
                    <Form.Control
                      disabled={checkoutPending}
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value.trim())}
                    />
                  </Form.Group>

                  <Button
                    disabled={
                      initialsPending ||
                      checkoutPending ||
                      getPending ||
                      Object.values(cartPending.update).some(Boolean) ||
                      Object.values(cartPending.remove).some(Boolean) ||
                      address.length < 3 ||
                      deliver.code === "..."
                    }
                    className="w-100 mt-4 mb-2 css-btn-dark"
                    type="submit"
                  >
                    {progressButton(
                      initialsPending || checkoutPending,
                      "Continue"
                    )}
                  </Button>

                  {collapseElement(
                    Boolean(checkoutError["unknown"]),
                    checkoutError["unknown"]
                  )}
                </Form>
              </div>
            </Collapse>
          </Col>

          <Col md={8} className="p-0 h-100">
            <Card className="h-100 border-0 bg-transparent">
              <Card.Header
                as={Card.Title}
                className="border text-secondary p-3 bg-white"
              >
                {`Cart (${orders?.length || 0})`}
              </Card.Header>

              <ListGroup
                variant="flush"
                className={`overflow-auto ${
                  checkoutPending && "opacity-75 css-cursor-progress"
                }`}
              >
                {!(getPending || initialsPending) &&
                  orders?.map((order, idx) => {
                    return (
                      <ListGroup.Item
                        className={`border shadow-sm ${
                          checkoutPending && "pe-none"
                        }`}
                        key={idx}
                      >
                        <CartItem order={order} />
                      </ListGroup.Item>
                    );
                  })}

                <div className={statusStyle}>
                  {getPending || initialsPending
                    ? Progress()
                    : orders?.length === 0
                    ? "Cart is empty."
                    : "Cart Loaded."}
                </div>
              </ListGroup>
            </Card>
          </Col>
        </Row>
      </Container>

      {/* Stripe card details */}
      <Modal
        show={stripeModal}
        onHide={() => setStripeModal(false)}
        backdrop="static"
        centered
        keyboard={false}
      >
        <Stripe />
      </Modal>
    </div>
  );
};

export default Cart;
