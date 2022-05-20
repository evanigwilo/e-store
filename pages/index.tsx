// 👇 Next.js modules
import { NextPage } from "next";
import Head from "next/head";
// 👇 React-Bootstrap modules
import Card from "react-bootstrap/Card";
import Container from "react-bootstrap/Container";
// 👇 Custom modules
import Carousel from "../components/Carousel";
import Category from "../components/Category";
import AuthRoute from "../components/AuthRoute";

import { appTitle } from "../utils/constants";
import styles from "../styles/AppBar.module.css";

const Home: NextPage = () => {
  // 👉 console.log("Home");

  return (
    <div>
      <Head>
        <title>{`${appTitle}. Spend less. Smile more.`}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <Container fluid="lg">
        <AuthRoute />
        <Carousel />
        <Category />
      </Container>

      <footer>
        <Card
          bg="light"
          className={`shadow-sm text-center ${styles["backdrop-filter"]} ${styles["backdrop-filter-high"]}`}
        >
          <Card.Body>
            <Card.Title
              title="Top"
              onClick={() => {
                window.scrollTo({
                  top: 0,
                  behavior: "smooth",
                });
              }}
            >
              <i role="button" className="bi bi-chevron-up"></i>
            </Card.Title>
            <Card.Text>
              <span>
                {`Copyright © 2022 All rights reserved | Developed by `}
              </span>
              <a
                className="fw-bold link"
                target="_blank"
                rel="noopener noreferrer"
                href="https://github.com/evanigwilo"
              >
                Evan Igwilo
              </a>
            </Card.Text>
          </Card.Body>
        </Card>
      </footer>
    </div>
  );
};

export default Home;
