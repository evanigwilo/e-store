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

      <footer></footer>
    </div>
  );
};

export default Home;
