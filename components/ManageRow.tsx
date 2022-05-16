import React from "react";
import { NextComponentType, NextPageContext } from "next";
import { useRouter } from "next/router";

import numeral from "numeral";

import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Badge from "react-bootstrap/Badge";

import { Product } from "../utils/types";
import ImageColumn from "./ImageColumn";

const ManageRow: NextComponentType<
  NextPageContext,
  {},
  {
    url: string;
    product: Product;
  }
> = (props) => {
  const {
    url,
    product: { id, name, category, price, createdAt },
  } = props;
  const router = useRouter();

  const rowStyle = {
    borderRadius: "15px",
    maxHeight: "200px",
  };

  // 👉 console.log("ManageRow");

  return (
    <Row
      data-testid={id}
      className="g-0 border text-center my-2 p-3 bg-white align-items-center text-secondary"
      style={rowStyle}
    >
      <ImageColumn text={category} title={name} url={url} />
      <Col xs={4} sm={3} md={2} className="text-break">
        {numeral(price).format("$0,0.00")}
      </Col>
      <Col xs={2} className="d-lg-block d-none">
        {category}
      </Col>
      <Col xs={2} className="d-md-block d-none">
        {new Date(createdAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </Col>
      <Col xs={2} lg={1} className="d-sm-block d-none">
        <Badge pill className="py-2" bg="success">
          Published
        </Badge>
      </Col>
      <Col
        xs={1}
        onClick={() => {
          router.push(router.pathname + "?id=" + id, undefined, {
            shallow: true,
          });
        }}
      >
        <i
          role="button"
          title="Edit"
          className="bi bi-pencil-square css-mouse-enter"
        ></i>
      </Col>
    </Row>
  );
};

export default ManageRow;
