import {
  useEffect,
  useState,
  useRef,
  useMemo,
  memo,
  SetStateAction,
} from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { NextComponentType, NextPageContext } from "next";

import numeral from "numeral";

import NavDropdown from "react-bootstrap/NavDropdown";
import FormControl from "react-bootstrap/FormControl";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import InputGroup from "react-bootstrap/InputGroup";
import Table from "react-bootstrap/Table";

import {
  collapseElement,
  debounce,
  Progress,
  getImageUrl,
  getImageSlot,
} from "../utils/helpers";
import { statusStyle } from "../utils/constants";
import styles from "../styles/SearchBar.module.css";

import {
  selectProduct,
  searchProductAsync,
} from "../redux/reducer/productSlice";

import { useAppDispatch, useAppSelector } from "../redux/hooks";
import ImageColumn from "./ImageColumn";

const SearchBar: NextComponentType<
  NextPageContext,
  {},
  {
    appBar: HTMLElement | null;
    cart: HTMLSpanElement | null;
    setNextPage: (value: SetStateAction<boolean>) => void;
  }
> = (props) => {
  const { appBar, cart, setNextPage } = props;
  const searchBar = useRef<HTMLInputElement | null>(null);
  const searchModalRef = useRef<
    | (HTMLSpanElement & { backdrop: HTMLDivElement; dialog: HTMLDivElement })
    | null
  >(null);
  const {
    category: { result: categories },
    query: { pending: queryPending, error: queryError, result: queryResult },
  } = useAppSelector(selectProduct);

  const routeUrl = useRef("");
  const [searchModal, setSearchModal] = useState(false);
  const [filter, setFilter] = useState("All");
  const router = useRouter();
  const dispatch = useAppDispatch();

  useEffect(() => {
    setSearchModal(false);
  }, [router]);
  useEffect(() => {
    if (queryPending) {
      setSearchModal(true);
    } else if (searchModal) {
      searchBar.current?.focus();
    }
  }, [queryPending]);
  useEffect(() => {
    if (searchModal) {
      findProduct(searchBar.current?.value);
    }
  }, [filter]);

  const navCategory = useMemo(
    () =>
      ["All", ...categories].map((category, idx) => (
        <NavDropdown.Item
          key={idx}
          active={filter === category}
          onClick={() => setFilter(category)}
        >
          {category}
        </NavDropdown.Item>
      )),
    [categories, filter]
  );
  const navFilter = (id?: string) => (
    <NavDropdown
      disabled={queryPending}
      title={filter}
      id={id}
      className="fs-6 p-0"
      onContextMenu={(e) => e.preventDefault()}
    >
      {navCategory}
    </NavDropdown>
  );
  const findProduct = (value?: string) => {
    const search = value?.trim() || "";
    // 👇 only trigger search after 500ms since last call
    debounce(
      "FIND_PRODUCT",
      () => {
        dispatch(
          searchProductAsync({
            search,
            category: filter === "All" ? "" : filter,
          })
        );
      },
      500
    );
  };
  const cartVisible = (visible: "show" | "hide") => {
    if (!cart) {
      return;
    }
    const closest = cart.closest("div");
    if (!closest) {
      return;
    }
    if (cart.offsetParent) {
      return;
    }
    if (visible === "hide") {
      closest.classList.remove("d-none");
    } else {
      closest.classList.add("d-none");
    }
  };

  // 👉 console.log("SearchBar");

  return (
    <>
      <Form className={`d-flex w-100 ${styles["max-width"]}`}>
        <InputGroup className="position-relative w-100">
          {/* {navFilter(styles["button-filter"])} */}
          <FormControl
            type="search"
            placeholder="Search"
            aria-label="Search"
            ref={searchBar}
            disabled={queryPending}
            onFocus={() => cartVisible("show")}
            onBlur={() => cartVisible("hide")}
            onChange={() => findProduct(searchBar.current?.value)}
            onClick={() => findProduct(searchBar.current?.value)}
            className={styles["search"]}
          />
          <i
            role="button"
            onClick={() => findProduct(searchBar.current?.value)}
            className={
              "bi bi-search text-secondary d-block d-sm-none css-z-index-dropdown " +
              "position-absolute top-50 translate-middle-y ps-3 " +
              (queryPending && "pe-none opacity-75")
            }
          ></i>
        </InputGroup>

        <Button
          disabled={queryPending}
          variant="outline-success d-none d-sm-block ms-2"
          onClick={() => findProduct(searchBar.current?.value)}
        >
          Search
        </Button>
      </Form>

      <Modal
        onShow={() => {
          if (searchModalRef.current && appBar) {
            const height = appBar.clientHeight + "px";
            const {
              current: { backdrop, dialog },
            } = searchModalRef;
            backdrop.style.top = height;
            dialog.style.top = height;
          }
        }}
        ref={searchModalRef}
        enforceFocus={false}
        // scrollable
        show={searchModal}
        onHide={() => setSearchModal(false)}
        contentClassName="border border-0 border-top"
        className={`text-secondary ${styles["modal-search"]}`}
      >
        <Modal.Header
          //  d-flex d-md-none
          closeButton
          className="py-2 px-3"
        >
          <Modal.Title className="d-flex align-items-center w-100">
            <span className="fs-6">Find By:</span>
            {navFilter()}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-0">
          {queryPending ? (
            <span className={statusStyle}>{Progress()}</span>
          ) : !queryResult.length && !Boolean(queryError["unknown"]) ? (
            <span className={statusStyle}>No Product Matched.</span>
          ) : (
            <div className="position-relative">
              <div className="css-content-center">
                {collapseElement(
                  Boolean(queryError["unknown"]),
                  queryError["unknown"],
                  "my-2"
                )}
              </div>

              <Table role="button" size="sm" className="m-0" borderless hover>
                <tbody>
                  {queryResult.map((product, idx) => {
                    const slot = getImageSlot(product);
                    const className = "text-secondary";
                    routeUrl.current = `/category/${product.category.toLowerCase()}?product=${
                      product.id
                    }`;
                    return (
                      <tr
                        key={idx}
                        onClick={() => {
                          router.push(routeUrl.current, undefined, {
                            shallow: true,
                          });
                          if (searchBar.current) {
                            searchBar.current.value = "";
                          }
                          setSearchModal(false);
                        }}
                        className="align-middle text-center border-bottom"
                      >
                        <td>
                          <div>
                            <Link href={routeUrl.current} passHref>
                              <a
                                className="text-decoration-none text-secondary"
                                onClick={() => setNextPage(true)}
                              >
                                <ImageColumn
                                  url={
                                    slot ? getImageUrl(product.id, slot, 0) : ""
                                  }
                                  title={product.name}
                                  text=""
                                  size={{
                                    height: "50px",
                                    maxWidth: "100px",
                                  }}
                                />
                              </a>
                            </Link>
                          </div>
                        </td>
                        <td>
                          <div className={className}>{product.category}</div>
                        </td>
                        <td>
                          <div className={className}>
                            {numeral(product.price).format("$0,0.00")}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </div>
          )}
        </Modal.Body>
      </Modal>
    </>
  );
};

export default memo(SearchBar);
