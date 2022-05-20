import { useEffect, useState, useRef, MouseEventHandler } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { NextComponentType } from "next";

import Navbar from "react-bootstrap/Navbar";
import Nav from "react-bootstrap/Nav";
import NavDropdown from "react-bootstrap/NavDropdown";
import Offcanvas from "react-bootstrap/Offcanvas";
import Modal from "react-bootstrap/Modal";
import Spinner from "react-bootstrap/Spinner";
import Badge from "react-bootstrap/Badge";

import CookieConsent from "react-cookie-consent";

import {
  selectUser,
  userActions,
  locationAsync,
} from "../redux/reducer/userSlice";
import { selectCart, getCartAsync } from "../redux/reducer/cartSlice";
import { categoryAsync } from "../redux/reducer/productSlice";
import basketImage from "../public/assets/images/shop-basket-3.png";
import { useAppDispatch, useAppSelector } from "../redux/hooks";
import AppTitle from "./AppTitle";
import styles from "../styles/AppBar.module.css";
import SearchBar from "./SearchBar";
import Loader from "./Loader";
import axios from "../services/axios";
import { persistor } from "../redux/store";

const AppBar: NextComponentType = () => {
  const appBar = useRef<HTMLElement | null>(null);
  const cart = useRef<HTMLSpanElement | null>(null);
  const [nextPage, setNextPage] = useState(false);
  const [signOutModal, setSignOutModal] = useState(false);
  const router = useRouter();
  const dispatch = useAppDispatch();
  const {
    country: { deliver, supported },
    initials: {
      admin,
      authenticated,
      pending,
      username,
      emailVerified,
      manageProducts,
    },
  } = useAppSelector(selectUser);
  const {
    cart: { orders },
  } = useAppSelector(selectCart);
  const { countryPreferred, restore } = userActions;
  const navExpand = "lg";

  const signOut = async () => {
    setSignOutModal(true);
    try {
      await axios.post("/logout");
      dispatch(restore());
      // 👇 purge any persisted state
      await persistor.purge();
      dispatch(locationAsync());
    } finally {
      setSignOutModal(false);
      router.push("/", undefined, { shallow: true });
      // router.reload();
    }
  };

  const navItem = (
    icon: string,
    text: string,
    onClick?: MouseEventHandler<HTMLElement>
  ) => (
    <NavDropdown.Item
      className="my-0 text-body"
      onContextMenu={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {icon && <i className={`bi bi-${icon} me-1`}></i>}
      {text}
    </NavDropdown.Item>
  );

  useEffect(() => {
    dispatch(categoryAsync());
    dispatch(locationAsync());
    setNextPage(false);
  }, [router]);
  useEffect(() => {
    if (!pending) {
      dispatch(getCartAsync());
    }
  }, [pending]);

  // 👉 console.log("AppBar");

  return (
    <>
      <Navbar
        collapseOnSelect
        sticky="top"
        id="appbar"
        ref={appBar}
        // bg="light"
        expand={navExpand}
        className={`shadow-sm py-0 px-3 flex-nowrap ${styles["backdrop-filter"]} ${styles["backdrop-filter-high"]}`}
      >
        <Navbar.Brand href="/">
          <div
            className="d-flex align-items-center css-mouse-enter"
            // onClick={() => router.reload()} //window.location.reload()}
          >
            <Image
              src={"/" + basketImage.src}
              alt="commerce"
              width={50}
              height={45}
              layout="fixed"
            />
            {/* <Navbar.Collapse > */}
            <AppTitle className="ms-2 h4 d-sm-block d-none" />
            {/* </Navbar.Collapse> */}
          </div>
        </Navbar.Brand>

        <div className="flex-grow-1 d-flex px-2 justify-content-between">
          <SearchBar
            appBar={appBar.current}
            cart={cart.current}
            setNextPage={setNextPage}
          />
          <Link href="/cart" passHref>
            <div
              onClick={() => setNextPage(true)}
              className="link text-secondary ps-2 pe-lg-0 pe-2 d-flex align-items-center justify-content-center"
            >
              <i className="bi bi-cart3 mx-1"></i>
              <span ref={cart} className="d-none d-sm-inline">
                Cart
              </span>
              <Badge pill bg="secondary" className="ms-1">
                {orders?.length || 0}
              </Badge>
            </div>
          </Link>
        </div>

        <Navbar.Offcanvas
          id={`offcanvasNavbar-expand-${navExpand}`}
          aria-labelledby={`offcanvasNavbarLabel-expand-${navExpand}`}
          placement="end"
          className="flex-row-reverse w-100"
        >
          <Offcanvas.Header closeButton>
            <Offcanvas.Title id={`offcanvasNavbarLabel-expand-${navExpand}`}>
              {/* Offcanvas */}
            </Offcanvas.Title>
          </Offcanvas.Header>

          <Offcanvas.Body>
            <Nav>
              <NavDropdown
                id={styles["deliver-nav"]}
                title={
                  <span className={styles["nav-wrap"]}>
                    <i className="bi bi-geo-alt mx-1"></i>
                    {`Deliver to ${deliver.code} ${deliver.emoji}`}
                  </span>
                }
                onContextMenu={(e) => e.preventDefault()}
              >
                {supported.map(({ emoji, code, name }) => (
                  <NavDropdown.Item
                    key={code}
                    active={code === deliver.code}
                    onClick={() => dispatch(countryPreferred({ emoji, code }))}
                    className="text-body" // text-center
                  >
                    {`${emoji} ${name}`}
                  </NavDropdown.Item>
                ))}
              </NavDropdown>

              <NavDropdown
                id={styles["account-nav"]}
                title={
                  <span className={`text-capitalize ${styles["nav-wrap"]}`}>
                    <i className="bi bi-person mx-1"></i>
                    {`Account ${authenticated ? `(${username})` : ""}`}
                  </span>
                }
              >
                <div className="shadow-sm">
                  {pending ? (
                    navItem("", "...")
                  ) : authenticated ? (
                    <>
                      <Link href="/" passHref>
                        {navItem("box-arrow-left", "Sign out", () => signOut())}
                      </Link>

                      {!emailVerified && (
                        <Link href="/verify" passHref>
                          {navItem("shield-check", "Verify email", () =>
                            setNextPage(true)
                          )}
                        </Link>
                      )}
                    </>
                  ) : (
                    <Link href="/login" passHref>
                      {navItem("box-arrow-in-right", "Sign in", () =>
                        setNextPage(true)
                      )}
                    </Link>
                  )}

                  {/* <NavDropdown.Divider className="my-0" /> */}
                  {admin && (
                    <Link href="/users" passHref>
                      {navItem("people", "Manage Users", () =>
                        setNextPage(true)
                      )}
                    </Link>
                  )}

                  {(admin || manageProducts) && (
                    <Link href="/products" passHref>
                      {navItem("pencil-square", "Manage Products", () =>
                        setNextPage(true)
                      )}
                    </Link>
                  )}
                </div>
              </NavDropdown>

              <Link href="/orders" passHref>
                <Nav.Link onClick={() => setNextPage(true)} className="me-1">
                  <i className="bi bi-box-seam mx-1"></i>
                  <span>Orders</span>
                </Nav.Link>
              </Link>
            </Nav>
          </Offcanvas.Body>
        </Navbar.Offcanvas>

        <Navbar.Toggle aria-controls="navbarScroll" className="ms-auto" />
      </Navbar>

      {/* Signout Modal*/}
      <Modal
        show={signOutModal}
        onHide={() => setSignOutModal(false)}
        backdrop="static"
        keyboard={false}
        centered
        contentClassName="bg-transparent border-0"
      >
        <Modal.Body
          className={`shadow-sm text-secondary ${styles["modal-body"]} ${styles["backdrop-filter"]} ${styles["backdrop-filter-high"]}`}
        >
          <Spinner animation="border" className={styles["spinner"]} />
          Signing out...
        </Modal.Body>
      </Modal>

      {/* Loading Screen */}
      <Loader show={nextPage} />

      {/* Cookie Consent */}
      <CookieConsent
        containerClasses={`ps-3 text-secondary align-items-center ${styles["backdrop-filter"]} ${styles["backdrop-filter-high"]}`}
        buttonClasses="rounded css-mouse-enter"
        location="bottom"
        buttonText="Understood"
      >
        <h4>{"We respect your privacy "}</h4>
        <small>This website uses cookies to enhance the user experience.</small>
      </CookieConsent>
    </>
  );
};

export default AppBar;
