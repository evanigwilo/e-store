import React from "react";
import { NextComponentType } from "next";

import Link from "next/link";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Card from "react-bootstrap/Card";
import Placeholder from "react-bootstrap/Placeholder";

import { categoryType } from "../utils/constants";
import { useAppSelector } from "../redux/hooks";
import { selectProduct } from "../redux/reducer/productSlice";
import styles from "../styles/Category.module.css";

const Category: NextComponentType = () => {
  const {
    category: { result: categories },
  } = useAppSelector(selectProduct);

  const placeholder = () =>
    Array.from({ length: 10 }, (_, idx) => (
      <Col key={idx}>
        <Card bg="light" className="shadow-sm">
          <Placeholder animation="glow">
            <Placeholder className={`w-100 ${styles["height-150px"]}`} />
          </Placeholder>
          <Card.Body>
            <Placeholder
              as={Card.Title}
              animation="glow"
              className="text-center"
            >
              <Placeholder xs={8} />
            </Placeholder>
            <Placeholder
              as={Card.Text}
              animation="glow"
              className="text-center d-none d-md-block"
            >
              <Placeholder xs={7} /> <Placeholder xs={4} />
              <Placeholder xs={4} /> <Placeholder xs={6} />
              <Placeholder xs={8} />
            </Placeholder>
          </Card.Body>
        </Card>
      </Col>
    ));
  const allCategories = () =>
    categories.map((category, idx) => (
      <Col key={idx}>
        <Link href={`/category/${category.toLowerCase()}`} passHref>
          <Card bg="light" className="shadow-sm css-mouse-enter cursor-pointer">
            <Card.Img
              height="120"
              variant="top"
              src={`/assets/images/category/${category}.jpg`}
            />
            <Card.Body>
              <Card.Title className={`text-center ${styles["height-40px"]}`}>
                <span>
                  <i className={`bi ${categoryType[category].icon} me-2`}></i>
                  {category}
                </span>
              </Card.Title>
              <Card.Text
                className={`text-center css-line-number-5 d-none d-md-block ${styles["height-100px"]}`}
              >
                {categoryType[category].description}
              </Card.Text>
            </Card.Body>
          </Card>
        </Link>
      </Col>
    ));

  return (
    <div className={styles.position}>
      <Row xs={2} md={2} lg={3} className="g-2 g-sm-3 justify-content-center">
        {categories.length ? allCategories() : placeholder()}
      </Row>
    </div>
  );
};

export default Category;
