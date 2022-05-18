// 👇 React modules
import { useRef, useEffect, useState } from "react";
// 👇 Next.js modules
import { NextPage } from "next";
import Head from "next/head";
// 👇 React-Bootstrap modules
import Col from "react-bootstrap/Col";
import Accordion from "react-bootstrap/Accordion";
import Row from "react-bootstrap/Row";
import Container from "react-bootstrap/Container";
import Card from "react-bootstrap/Card";
import Badge from "react-bootstrap/Badge";
import ListGroup from "react-bootstrap/ListGroup";
// 👇 React Intersection Observer module
import { useInView } from "react-intersection-observer";
// 👇 Custom modules
import { darkOpacityText, appTitle } from "../utils/constants";
import { Progress, nextPage, inViewStatus } from "../utils/helpers";
import {
  KeyValue,
  OrderGroup,
  OrderGroupState,
  QueryParams,
} from "../utils/types";
import { useOrdersQuery } from "../redux/reducer/querySlice";
import OrderItem from "../components/OrderItem";

const Orders: NextPage = () => {
  const { ref, inView } = useInView();

  const appBar = useRef<HTMLElement | null>(null);
  const randomTime = useRef(Date.now());
  const filter = useRef<OrderGroup>("succeeded");
  const { current: group } = useRef<OrderGroupState>({
    all: { active: false, background: "secondary" },
    succeeded: { active: true, background: "success" },
    canceled: { active: false, background: "danger" },
    requested: { active: false, background: "primary" },
  });

  const [queryParams, setQueryParams] = useState<QueryParams>({
    key: randomTime.current,
    page: 1,
    category: filter.current,
  });
  const {
    data: orders,
    isLoading,
    isFetching,
    error,
  } = useOrdersQuery(queryParams, {
    // refetchOnFocus: true,
    // refetchOnMountOrArgChange: true,
  });
  const isLoadingOrFetching = isLoading || isFetching;

  const setFilter = (value: OrderGroup, resetKey = false) => {
    group[filter.current].active = false;
    group[value].active = true;
    filter.current = value;
    if (resetKey) {
      // 👇 reset time to force image reload
      randomTime.current = Date.now();
    }
    setQueryParams((prev) => ({
      ...prev,
      key: randomTime.current,
      body: undefined,
      page: 1,
      category: value,
    }));
  };

  useEffect(() => {
    // 👇 appBar element reference for its height
    if (!appBar.current) {
      appBar.current = document.getElementById("appbar");
    }

    nextPage(
      error,
      orders?.lastKey,
      isLoadingOrFetching || !inView,
      setQueryParams
    );
  }, [orders, error, inView, isLoadingOrFetching]);

  // 👉 console.log("Orders");

  return (
    <div>
      <Head>
        <title>{`${appTitle} | Orders`}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <Container fluid="lg" className={darkOpacityText}>
        <Row
          style={{
            height: `calc(100vh - ${appBar.current?.clientHeight}px)`,
          }}
          className="p-2 border-0 d-flex"
        >
          <Col className="p-0 h-100 overflow-auto">
            <Card className="h-100 border-0 bg-transparent">
              <Card.Header
                as={Card.Title}
                className={
                  "border d-grid gap-3 gap-sm-0 " +
                  "d-sm-flex justify-content-sm-between text-secondary " +
                  "p-3 bg-white"
                }
              >
                {`Orders (${orders?.ids.length || 0})`}
                <div className="d-flex align-items-center">
                  {Object.entries(group).map(
                    ([key, { active, background }]) => (
                      <Badge
                        key={key}
                        pill
                        role="button"
                        text={active ? undefined : background}
                        bg={active ? background : "white"}
                        className={`text-capitalize fw-normal px-2 ${
                          isLoadingOrFetching && "pe-none opacity-75"
                        }`}
                        onClick={() => setFilter(key as OrderGroup)}
                      >
                        {key}
                      </Badge>
                    )
                  )}
                  <div className="d-flex px-2">
                    {isFetching ? (
                      Progress("sm")
                    ) : (
                      <i
                        role="button"
                        title="Refresh"
                        className="bi bi-arrow-clockwise css-mouse-enter"
                        onClick={() => setFilter(filter.current, true)}
                      ></i>
                    )}
                  </div>
                </div>
              </Card.Header>

              <ListGroup variant="flush" className="border-0 overflow-auto">
                <Accordion defaultActiveKey={["0"]} alwaysOpen>
                  {orders?.ids.map((id, idx) => (
                    <ListGroup.Item
                      className="bg-transparent border-0 p-0 my-2"
                      key={idx}
                    >
                      <OrderItem
                        order={orders.entities[id]!}
                        randomTime={randomTime.current}
                      />
                    </ListGroup.Item>
                  ))}
                </Accordion>

                {inViewStatus(
                  ref,
                  isLoadingOrFetching,
                  Boolean(orders?.ids.length),
                  "order",
                  error as KeyValue
                )}
              </ListGroup>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default Orders;
