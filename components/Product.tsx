import { useState, memo, useEffect, useMemo } from "react";
import { NextComponentType, NextPageContext } from "next";
import { useAppDispatch, useAppSelector } from "../redux/hooks";

import numeral from "numeral";

import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import Button from "react-bootstrap/Button";
import Collapse from "react-bootstrap/Collapse";
import Table from "react-bootstrap/Table";

import {
  selectCart,
  cartRemoveAsync,
  cartUpdateAsync,
  selectCartCount,
} from "../redux/reducer/cartSlice";
import {
  debounce,
  getImageSlot,
  getImageUrl,
  hasImage,
  Progress,
  progressButton,
} from "../utils/helpers";
import { Product } from "../utils/types";
import { slotCount } from "../utils/constants";
import ImageColumn from "./ImageColumn";
import styles from "../styles/Product.module.css";

const Product: NextComponentType<
  NextPageContext,
  {},
  {
    product: Product;
    randomTime: number;
  }
> = (props) => {
  const { randomTime, product } = props;
  const { id: productId, name, category, price } = product;
  const count = useAppSelector(selectCartCount(productId));
  const {
    pending: {
      cart: { update: updatePending, remove: removePending },
    },
  } = useAppSelector(selectCart);
  const dispatch = useAppDispatch();

  const [details, setDetails] = useState(false);
  const [total, setTotal] = useState(count);

  useEffect(() => {
    if (total === count) {
      return;
    }
    // 👇 only trigger update/remove after 500ms since last call
    debounce(
      "UPDATE_TOTAL",
      () =>
        dispatch(
          total === 0
            ? cartRemoveAsync({ productId })
            : cartUpdateAsync({
                order: {
                  productId,
                  count: total,
                },
                productId,
                product,
                slot,
              })
        ),
      500
    );
  }, [total]);

  // 👇 generates random stars
  const stars = useMemo(() => {
    //"⭐️"
    const value = Math.ceil(1 + Math.random() * 4);
    const stars = Array.from({ length: 5 }, (_, idx) => (
      <span
        key={idx}
        style={{
          textShadow: "-1px 0px 0px var(--bs-gray-500)",
          color: idx + 1 <= value ? "var(--bs-warning)" : "var(--bs-gray-400)",
        }}
      >
        ★
      </span>
    ));
    return (
      <>
        {stars}
        <span>{` (${numeral(Math.ceil(10 + Math.random() * 10e3)).format(
          "0,00"
        )}) ratings`}</span>
      </>
    );
  }, []);
  // 👇 specs as product information placeholder
  const specs = {
    Brand: "Acer",
    Series: "AV15-51-7617",
    "Screen Size": "15.6 Inches",
    Color: "Gray",
    "CPU Model": "Intel Core i7",
    "Ram Memory": "",
    "Installed Size": "16 GB",
    "Operating System": "Windows 11 Home",
    "Card Description": "Integrated",
    "CPU Speed": "5 GHz",
    "Hard Disk Description": "SSD",
  };
  const slot = getImageSlot(product);
  const urls = slotCount.map((slot) =>
    hasImage(product, slot) ? getImageUrl(productId, slot, randomTime) : ""
  );
  const cartPending =
    Object.values(updatePending).some(Boolean) ||
    Object.values(removePending).some(Boolean);

  // 👉 console.log("CurrentProduct");

  return (
    <>
      <div
        className={
          "h-100 border bg-white text-secondary p-3 mx-1 " +
          "flex-column d-flex justify-content-between " +
          styles["row"]
        }
      >
        <Row className="w-100 g-0">
          <ImageColumn
            url={slot ? getImageUrl(productId, slot, randomTime) : ""}
            title={name}
            text={category}
            flex="flex-row flex-column"
            paragraph="-"
            urls={urls}
          />
          {/* <Col xs={1}></Col> */}
        </Row>

        <div className="w-100">
          <Row className="g-0">
            <Col>{stars}</Col>
          </Row>

          <Row className="g-0">
            <Col>
              <span>Starting from </span>
              <span className="text-decoration-line-through">
                {numeral(price + price / 4).format("$0,0.00")}
              </span>

              <span className="fw-bold">{` ${numeral(price).format(
                "$0,0.00"
              )}`}</span>
            </Col>
          </Row>

          <Row className="g-0 mt-3">
            <Col className="d-flex align-items-center">
              <i
                title="Details"
                className={`d-block bi bi-arrow-down-circle fs-4 opacity-75 ${styles["rotate"]}`}
                onClick={({ target }) => {
                  setDetails(!details);
                  const classList = (target as HTMLElement).classList;
                  classList.toggle(styles["css-rotate-180"]);
                }}
              ></i>
            </Col>
            <Col className="text-end">
              {count === 0 ? (
                <Button
                  className="css-btn-dark py-2"
                  size="sm"
                  disabled={cartPending}
                  onClick={() => setTotal(1)}
                >
                  <i
                    className="bi bi-cart-plus pe-1"
                    style={{ WebkitTextStroke: "0.5px" }}
                  ></i>
                  {progressButton(
                    updatePending[productId] || removePending[productId],
                    "Add To Cart"
                  )}
                </Button>
              ) : (
                <div className="py-1">
                  <Button
                    size="sm"
                    variant="outline-secondary"
                    onClick={() => setTotal((prev) => Math.max(0, --prev))}
                    disabled={cartPending}
                  >
                    -
                  </Button>

                  {updatePending[productId] || removePending[productId] ? (
                    <div className="px-2 d-inline">{Progress("sm")}</div>
                  ) : (
                    <span className="px-2 fs-6 align-middle">{total}</span>
                  )}

                  <Button
                    size="sm"
                    variant="outline-secondary"
                    onClick={() => setTotal((prev) => ++prev)}
                    disabled={cartPending}
                  >
                    +
                  </Button>
                </div>
              )}
            </Col>
          </Row>
        </div>
      </div>

      <Collapse in={details}>
        <div className="m-2 mb-3 p-3 bg-white rounded-3 fw-light fs-6 lh-sm">
          <p className="fw-normal">About this item</p>
          <Table striped bordered size="sm">
            <tbody>
              {Object.entries(specs).map(([key, value]) => (
                <tr key={key}>
                  <td>{key}</td>
                  <td>{value}</td>
                </tr>
              ))}
            </tbody>
          </Table>
          <p>
            {
              "Intel Core i7-1195G7 Processor - up to 5.0 GHz, 4 cores, 8 threads, 12 MB Intel Smart Cache"
            }
          </p>
          <p>
            {
              '"15.6" Full HD (1920 x 1080) Widescreen LED-backlit IPS Display (100% sRGB & 300nit Brightness) | Intel Iris Xe Graphics | 16GB DDR4 Memory | 512GB NVMe SSD'
            }
          </p>
          <p>
            {
              "1 - USB 3.2 (Type-C) Gen 1 port (up to 5 Gbps) | 2 - USB 3.2 Gen 1 Ports (one with Power-off Charging) | 1 - USB 2.0 Port | 1 - HDMI 2.0 Port with HDCP support | 1 - Ethernet (RJ-45) Port"
            }
          </p>
          <p>
            {
              "Acer Bio-Protection Fingerprint Solution, featuring Computer Protection and Windows Hello Certification"
            }
          </p>
        </div>
      </Collapse>
    </>
  );
};

export default memo(Product);
