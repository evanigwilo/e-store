// 👇 React modules
import { useRef, useEffect, useState, useMemo } from "react";
// 👇 Next.js modules
import Head from "next/head";
import { NextPage } from "next";
import { useRouter } from "next/router";
// 👇 React-Bootstrap modules
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import Container from "react-bootstrap/Container";
import Card from "react-bootstrap/Card";
import Offcanvas from "react-bootstrap/Offcanvas";
import ListGroup from "react-bootstrap/ListGroup";
import NavDropdown from "react-bootstrap/NavDropdown";
// 👇 React Intersection Observer module
import { useInView } from "react-intersection-observer";
// 👇 Custom modules
import { useAppSelector } from "../../redux/hooks";
import { Product, QueryParams } from "../../utils/types";
import { Progress, inViewStatus, nextPage } from "../../utils/helpers";
import { sortBy } from "../../utils/constants";
import { useProductsQuery } from "../../redux/reducer/querySlice";
import { darkOpacityText } from "../../utils/constants";
import { selectProduct } from "../../redux/reducer/productSlice";
import { selectUser } from "../../redux/reducer/userSlice";
import { selectCart } from "../../redux/reducer/cartSlice";
import CurrentProduct from "../../components/Product";

const Category: NextPage = () => {
  const router = useRouter();
  const category = (router.query.category as string | undefined)?.split("?")[0];
  const productId = router.query.product as string;
  const [allCategories, setAllCategories] = useState(false);
  const randomTime = useRef(Date.now());
  const appBar = useRef<HTMLElement | null>(null);
  const listGroup = useRef<HTMLDivElement | null>(null);
  const filter = useRef<keyof typeof sortBy>("Popularity");
  const { ref, inView } = useInView();
  const [queryParams, setQueryParams] = useState<QueryParams>({
    key: randomTime.current,
    productId,
    category,
    page: 1,
  });
  const {
    data: products,
    isLoading,
    isFetching,
    error,
  } = useProductsQuery(queryParams, {
    skip: !queryParams.category, // skip fetch if category is not loaded from router query
  });
  const {
    category: { result: categories },
  } = useAppSelector(selectProduct);
  const {
    pending: { get: getPending },
  } = useAppSelector(selectCart);
  const {
    initials: { pending: authenticating },
  } = useAppSelector(selectUser);
  const isLoadingOrFetching =
    authenticating ||
    getPending ||
    isLoading ||
    isFetching ||
    !queryParams.category;

  // 👉 console.log("[Category]");

  useEffect(() => {
    // 👇 appBar element reference for its height
    if (!appBar.current) {
      appBar.current = document.getElementById("appbar");
    }
    // 👇 reset RTK query cache when category or productId changes
    if (
      queryParams.category !== category ||
      queryParams.productId !== productId
    ) {
      // 👇 reset time to force image reload
      randomTime.current = Date.now();
      setQueryParams({
        key: randomTime.current,
        productId,
        category,
        page: 1,
        sort: sortBy[filter.current],
      });
    }
  }, [category, productId]);

  useEffect(() => {
    // 👇 changes to trigger next page fetch
    nextPage(
      error,
      products?.lastKey,
      isLoadingOrFetching || !inView,
      setQueryParams
    );
  }, [products, error, inView, isLoadingOrFetching]);

  useEffect(() => {
    if (isLoadingOrFetching) {
      return;
    }
    // 👇 changes to trigger scroll to top of page
    listGroup.current?.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }, [queryParams.category, queryParams.sort, isLoadingOrFetching]);

  const setFilter = (value: keyof typeof sortBy, resetKey = false) => {
    filter.current = value;
    if (resetKey) {
      // 👇 reset time to force image reload
      randomTime.current = Date.now();
    }
    setQueryParams((prev) => ({
      ...prev,
      key: randomTime.current,
      category,
      body: undefined,
      page: 1,
      sort: sortBy[value],
    }));
  };

  const productsBatch = useMemo(() => {
    if (isLoadingOrFetching || !products?.ids.length) {
      return [];
    }
    const group: JSX.Element[] = [];
    const batch: JSX.Element[] = [];
    const style = "d-sm-flex";
    products.ids.forEach((id, idx) => {
      group.push(
        <div
          data-testid={id}
          key={idx}
          className={`w-100 mb-2 ${productId && "m-auto"}`}
          style={{
            flex: "0.5",
          }}
        >
          <CurrentProduct
            product={products.entities[id]! as Product}
            randomTime={randomTime.current}
          />
        </div>
      );

      if (idx % 2 !== 0) {
        batch.push(
          <div key={batch.length} className={style}>
            {[...group]}
          </div>
        );
        group.length = 0;
      }
    });
    if (group.length) {
      batch.push(
        <div key={batch.length} className={style}>
          {[...group]}
        </div>
      );
    }

    return batch;
  }, [queryParams.category, queryParams.sort, isLoadingOrFetching]);

  const navCategory = useMemo(
    () =>
      categories.map((item, idx) => {
        const categoryLower = item.toLowerCase();
        return (
          <NavDropdown.Item
            className="text-secondary"
            key={idx}
            active={categoryLower === category}
            onClick={() => {
              setAllCategories(false);
              router.push(`/category/${categoryLower}`, undefined, {
                shallow: true,
              });
            }}
          >
            {item}
          </NavDropdown.Item>
        );
      }),
    [categories, category]
  );

  // 👇 page title
  const title =
    category &&
    category[0].toUpperCase() +
      category.slice(1) +
      " Online Store" +
      ((productId &&
        products?.entities[productId] &&
        " | " + products.entities[productId]?.name) ||
        "");

  return (
    <div>
      <Head>
        <title>{title}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <Container fluid="lg" className={darkOpacityText}>
        <Row
          style={{
            height: `calc(100vh - ${appBar.current?.clientHeight}px)`,
          }}
          className="p-2 border-0 d-flex "
        >
          <Col className="p-0 h-100">
            <Card className="h-100 border-0 bg-transparent">
              <Card.Header
                as={Card.Title}
                className={
                  "d-grid gap-2 gap-sm-0 mb-1 " +
                  "d-sm-flex justify-content-sm-between text-secondary " +
                  "p-3 bg-white align-items-center text-capitalize"
                }
              >
                <div className="d-flex align-items-center">
                  <i
                    onClick={() => setAllCategories(true)}
                    className="bi bi-list-task me-1 mt-1 fs-2 css-mouse-enter"
                  ></i>
                  <span>{category}</span>
                </div>

                {!productId && (
                  <div className="d-flex align-items-center fs-6 fw-normal">
                    <span>Sort By -</span>
                    <NavDropdown
                      className={`bg-white rounded-3 ${
                        isLoadingOrFetching && "css-cursor-progress"
                      }`}
                      disabled={isLoadingOrFetching}
                      title={filter.current}
                      onContextMenu={(e) => e.preventDefault()}
                    >
                      {Object.keys(sortBy).map((item, idx) => (
                        <NavDropdown.Item
                          key={idx}
                          active={item === filter.current}
                          onClick={() => setFilter(item as keyof typeof sortBy)}
                        >
                          {item}
                        </NavDropdown.Item>
                      ))}
                    </NavDropdown>
                    <div className="d-flex px-2">
                      {isFetching ? (
                        Progress("sm")
                      ) : (
                        <i
                          title="Refresh"
                          className="bi bi-arrow-clockwise css-mouse-enter"
                          onClick={() => setFilter(filter.current, true)}
                        ></i>
                      )}
                    </div>
                  </div>
                )}
              </Card.Header>
              <div ref={listGroup} className="overflow-auto">
                <ListGroup variant="flush">{productsBatch}</ListGroup>

                {inViewStatus(
                  ref,
                  isLoadingOrFetching,
                  Boolean(products?.ids.length),
                  "product",
                  error,
                  productId
                    ? products?.ids.length
                      ? "Product Loaded."
                      : "Product Not Found"
                    : undefined
                )}
              </div>
              {/* )} */}
            </Card>
          </Col>
        </Row>
      </Container>

      {/* Categories selector */}
      <Offcanvas
        show={allCategories}
        onHide={() => setAllCategories(false)}
        className="shadow-sm css-z-index-toast"
      >
        <Offcanvas.Header closeButton className="ms-auto"></Offcanvas.Header>
        <Offcanvas.Body>{navCategory}</Offcanvas.Body>
      </Offcanvas>
    </div>
  );
};

export default Category;
