import { memo, useMemo } from "react";
import { NextComponentType, NextPageContext } from "next";
import Image from "next/image";
import numeral from "numeral";

import Col from "react-bootstrap/Col";
import Card from "react-bootstrap/Card";
import Row from "react-bootstrap/Row";
import Accordion from "react-bootstrap/Accordion";
import ListGroup from "react-bootstrap/ListGroup";

import { getImageUrl } from "../utils/helpers";
import { rowStyle, rowClass } from "../utils/constants";
import { Order } from "../utils/types";
import styles from "../styles/OrderItem.module.css";
import cardImage from "../public/assets/images/card.png";
import ImageColumn from "./ImageColumn";

const OrderItem: NextComponentType<
  NextPageContext,
  {},
  {
    order: Order;
    randomTime: number;
  }
> = (props) => {
  const {
    order: { intent, orders, createdAt, amount, status, location, user },
    randomTime,
  } = props;

  const url = useMemo(() => {
    let url = "";
    orders.some((item) => {
      if (item.slot) {
        url = getImageUrl(item.productId, item.slot, randomTime);
        return true;
      }
    });
    return url;
  }, [status, randomTime]);

  // 👇 convert intent to order no
  const orderNo = intent
    .substring(3)
    .split("")
    .reduce((acc, item) => {
      if (item >= "0" && item <= "9") {
        acc.push(item);
      } else {
        acc.push(item.toLowerCase().charCodeAt(0) - 96);
      }
      return acc;
    }, [] as (string | number)[])
    .join("")
    .substring(0, 10);

  const placedOn = new Date(createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const total = numeral(amount).format("$0,0.[00]");

  // 👉 console.log("OrderItem");

  return (
    <Accordion.Item eventKey={intent}>
      <Accordion.Header className={styles["accordion"]}>
        <Row
          className="w-100 g-0 text-center align-items-center text-secondary"
          style={rowStyle}
        >
          <ImageColumn
            url={url}
            title={orders[0].name}
            text={`Order No: ${orderNo}`}
            badge={{
              text: `+${orders.length} item(s)`,
              status: status,
            }}
          />

          <Col xs={3} className="text-break d-sm-block d-none">
            {total}
          </Col>
          <Col xs={6} sm={3}>
            {"On " + placedOn}
          </Col>
        </Row>
      </Accordion.Header>
      <Accordion.Body>
        <Card className="border-0">
          <Card.Header
            as={Card.Title}
            className={"d-grid gap-3 gap-sm-0 text-secondary p-3 bg-white"}
          >
            Summary
          </Card.Header>
        </Card>
        <ListGroup className="opacity-75">
          <ListGroup.Item>{`Order No: ${orderNo}`}</ListGroup.Item>
          <ListGroup.Item>{`Placed on ${placedOn}`}</ListGroup.Item>
          <ListGroup.Item>{`${orders.length} Item(s)`}</ListGroup.Item>
          <ListGroup.Item>{`Amount: ${total}`}</ListGroup.Item>
        </ListGroup>
        <Row className={rowClass} style={rowStyle}>
          <Col className="text-start">Product(s)</Col>
          <Col xs={3} className="text-break">
            Price
          </Col>
          <Col xs={2} className="d-none d-sm-block">
            Quantity
          </Col>
          <Col xs={2} className="d-block d-sm-none">
            Qty
          </Col>
        </Row>
        {orders.map((order, idx) => {
          const { name, category, price, count, productId, slot } = (order =
            order);

          return (
            <Row className={rowClass} style={rowStyle} key={idx}>
              <ImageColumn
                url={
                  slot ? getImageUrl(productId, slot, randomTime) : undefined
                }
                title={name}
                text={category}
              />

              <Col xs={3} className="text-break">
                {numeral(price).format("$0,0.[00]")}
              </Col>
              <Col xs={2}>{count}</Col>
            </Row>
          );
        })}
        <Card className="border-0">
          <Card.Header
            as={Card.Title}
            className={"d-grid gap-3 gap-sm-0 text-secondary p-3 bg-white"}
          >
            {"Payment & Delivery"}
          </Card.Header>
        </Card>
        <ListGroup className="opacity-75">
          <ListGroup.Item className="text-capitalize">{`Account Name: ${user}`}</ListGroup.Item>
          <ListGroup.Item className="py-0 d-flex align-items-center">
            {"Payment Method:"}

            <Image
              src={"/" + cardImage.src}
              alt="card"
              width={150}
              height={45}
              layout="fixed"
            />
          </ListGroup.Item>
          <ListGroup.Item>{`Shipping Fees: ${numeral(10).format(
            "$0,0.00"
          )}`}</ListGroup.Item>
          <ListGroup.Item>Delivery Method: Express Delivery</ListGroup.Item>
          <ListGroup.Item>{`Pick-up Address: ${location?.address}, ${location?.country}`}</ListGroup.Item>
        </ListGroup>
      </Accordion.Body>
    </Accordion.Item>
  );
};

export default memo(OrderItem);
