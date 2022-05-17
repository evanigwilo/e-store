// 👇 React modules
import { useEffect, useMemo, useRef, useState } from "react";
// 👇 Next.js modules
import { GetServerSideProps, NextPage } from "next";
import { useRouter } from "next/router";
import Head from "next/head";
// 👇 React-Bootstrap modules
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Stack from "react-bootstrap/Stack";
import NavDropdown from "react-bootstrap/NavDropdown";
import Button from "react-bootstrap/Button";
// 👇 React Intersection Observer module
import { useInView } from "react-intersection-observer";
// 👇 Custom modules
import {
  KeyValue,
  Product,
  QueryParams,
  ToastStatusUpdate,
} from "../utils/types";
import ManageRow from "../components/ManageRow";
import {
  getImageUrl,
  hasImage,
  nextPage,
  inViewStatus,
  isUserAuthenticated,
} from "../utils/helpers";
import {
  useProductsQuery,
  updateProduct,
  removeProduct,
} from "../redux/reducer/querySlice";
import { appTitle, categoryType, darkOpacityText } from "../utils/constants";
import { slotCount } from "../utils/constants";
import ManageProduct from "../components/ManageProduct";

// 👇 ssr: check if user is authorized to manage products
export const getServerSideProps: GetServerSideProps = async (context) => {
  const response = await isUserAuthenticated(context.req);

  if (response && (response.admin || response.manageProducts)) {
    return { props: {} };
  }
  return {
    redirect: {
      destination: "/?unauthorized",
      permanent: false,
    },
  };
};

const Products: NextPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const { ref, inView } = useInView();

  const manageProduct = router.isReady && id !== undefined;
  const allProducts = "All Products";
  const filter = useRef(allProducts);
  const randomTime = useRef(Date.now());
  const [queryParams, setQueryParams] = useState<QueryParams>({
    key: randomTime.current,
    page: 1,
  });
  const {
    data: products,
    isLoading,
    isFetching,
    error,
  } = useProductsQuery(queryParams, {
    // refetchOnFocus: true,
  });
  const isLoadingOrFetching = isLoading || isFetching;

  const header = useMemo(
    () => (
      <Stack
        direction="horizontal"
        className={`bg-white py-2 px-3 my-2 ${darkOpacityText}`}
      >
        <span>Filter By -</span>
        <NavDropdown
          className={`${isLoadingOrFetching && "css-cursor-progress"}`}
          disabled={isLoadingOrFetching}
          title={filter.current}
          onContextMenu={(e) => e.preventDefault()}
        >
          {[allProducts, ...Object.keys(categoryType)].map((category, idx) => (
            <NavDropdown.Item
              key={idx}
              active={category === filter.current}
              onClick={() => setFilter(category)}
            >
              {category}
            </NavDropdown.Item>
          ))}
        </NavDropdown>

        <Button
          className="ms-auto css-btn-dark py-2"
          size="sm"
          disabled={isLoadingOrFetching}
          onClick={() => {
            router.push(router.pathname + "?id=", undefined, {
              shallow: true,
            });
          }}
        >
          <i
            className="bi bi-plus-circle pe-1"
            style={{ WebkitTextStroke: "0.6px" }}
          ></i>
          <span>Add</span>
          <span className="d-sm-inline d-none ps-1">Product</span>
        </Button>
      </Stack>
    ),
    [isLoadingOrFetching]
  );

  const setFilter = (value: string) => {
    filter.current = value;
    const category = value === allProducts ? "" : value;
    setQueryParams((prev) => ({
      ...prev,
      body: undefined,
      page: 1,
      category,
    }));
  };

  useEffect(() => {
    // 👇 changes to trigger next page fetch
    nextPage(
      error,
      products?.lastKey,
      isLoadingOrFetching || !inView,
      setQueryParams
    );
  }, [products, error, inView, isLoadingOrFetching]);

  // 👉 console.log("Products");

  return (
    <div>
      <Head>
        <title>
          {`${appTitle} ${
            manageProduct
              ? `| Manage Products | ${id ? "Update" : "Add"} Product`
              : "| Manage Products"
          }`}
        </title>
      </Head>

      <Container fluid="lg" className="px-2">
        {header}
        <Row className={`g-0 text-center p-3 mb-2 bg-white ${darkOpacityText}`}>
          <Col className="text-start">Product Name</Col>
          <Col xs={4} sm={3} md={2}>
            Price
          </Col>
          <Col xs={2} className="d-lg-block d-none">
            Category
          </Col>
          <Col xs={2} className="d-md-block d-none">
            Date Created
          </Col>
          <Col xs={2} lg={1} className="d-sm-block d-none">
            Status
          </Col>
          <Col xs={1}></Col>
        </Row>
        {products?.ids.map((id, index) => {
          let url = "";
          const product = products.entities[id]!;
          slotCount.some((slot) => {
            if (hasImage(product, slot)) {
              url = getImageUrl(product.id!, slot, randomTime.current);
              return true;
            }
          });

          return (
            <ManageRow
              key={index}
              url={url}
              product={product as Required<Product>}
            />
          );
        })}
        {inViewStatus(
          ref,
          isLoadingOrFetching,
          Boolean(products?.ids.length),
          "product",
          error as KeyValue
        )}
      </Container>

      {/* Manage product modal */}
      {manageProduct && (
        <ManageProduct
          router={router}
          filter={filter.current === allProducts ? "" : filter.current}
          productId={id as string}
          removeProduct={(id: string) => removeProduct(id, queryParams)}
          updateProduct={(update: ToastStatusUpdate) => {
            randomTime.current = Date.now();
            updateProduct(update, queryParams);
          }}
        />
      )}
    </div>
  );
};

export default Products;
