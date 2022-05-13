import { useState, useRef, memo, useEffect } from "react";
import { NextComponentType, NextPageContext } from "next";

import numeral from "numeral";

import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import Button from "react-bootstrap/Button";

import { useAppDispatch, useAppSelector } from "../redux/hooks";
import {
  cartRemoveAsync,
  cartUpdateAsync,
  selectCart,
} from "../redux/reducer/cartSlice";
import { debounce, getImageUrl, Progress } from "../utils/helpers";
import { OrderOrders } from "../utils/types";
import { rowClass, rowStyle } from "../utils/constants";
import ImageColumn from "./ImageColumn";
import DeleteModal from "./DeleteModal";

const CartItem: NextComponentType<
  NextPageContext,
  {},
  {
    order: OrderOrders;
  }
> = (props) => {
  const {
    order: { productId, category, count, name, price, slot },
  } = props;

  const randomTime = useRef(Date.now());

  const dispatch = useAppDispatch();
  const {
    pending: {
      cart: { update: updatePending, remove: removePending },
    },
  } = useAppSelector(selectCart);

  const [showRemove, setShowRemove] = useState(false);
  const [total, setTotal] = useState(count);

  useEffect(() => {
    if (total === count) {
      return;
    }
    // 👇 only trigger update after 250ms since last call
    debounce(
      "UPDATE_TOTAL",
      () =>
        dispatch(
          cartUpdateAsync({
            order: {
              productId,
              count: total,
            },
            productId,
          })
        ),
      250
    );
  }, [total]);

  useEffect(() => {
    // 👇 reset time to force image reload
    randomTime.current = Date.now();
    setTotal(count);
  }, [productId]);

  const cartPending =
    Object.values(updatePending).some(Boolean) ||
    Object.values(removePending).some(Boolean);

  // 👉 console.log("CartItem");

  return (
    <>
      <Row className={rowClass} style={rowStyle}>
        <ImageColumn
          url={
            slot ? getImageUrl(productId, slot, randomTime.current) : undefined
          }
          title={name}
          text={category}
        />

        <Col xs={3} className="text-break">
          {numeral(price).format("$0,0.[00]")}
        </Col>
        <Col xs={3} className="css-content-center gap-4 gap-sm-2">
          <div className="d-flex align-items-center">
            <Button
              size="sm"
              variant="outline-secondary"
              onClick={() => setTotal((prev) => Math.max(0, --prev))}
              disabled={cartPending || total < 2}
            >
              -
            </Button>
            {updatePending[productId] ? (
              <div className="css-content-center px-2">{Progress("sm")}</div>
            ) : (
              <span className="px-2 fs-6">{total}</span>
            )}

            <Button
              // className="border-2 fw-bold"
              size="sm"
              variant="outline-secondary"
              onClick={() => setTotal((prev) => ++prev)}
              disabled={cartPending}
            >
              +
            </Button>
          </div>
          <div
            className={`css-content-center css-mouse-enter ${
              (removePending[productId] || cartPending) && "pe-none"
            }`}
            onClick={() => setShowRemove(true)}
          >
            {removePending[productId] ? (
              Progress()
            ) : (
              <i
                className={
                  "bi bi-trash3 pe-1 " +
                  "text-opacity-75 fs-3 " +
                  (cartPending ? "pe-none text-secondary" : "text-danger")
                }
              ></i>
            )}
            Remove
          </div>
        </Col>
      </Row>

      <DeleteModal
        show={showRemove}
        setShow={setShowRemove}
        message={`Remove ${name} from cart ?`}
        loading={cartPending}
        onClickDelete={() => {
          dispatch(cartRemoveAsync({ productId }));
          setShowRemove(false);
        }}
      />
    </>
  );
};

export default memo(CartItem);
