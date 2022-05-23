// 👇 React modules
import { useEffect } from "react";
// 👇 Next.js modules
import { GetServerSideProps, NextPage } from "next";
import Head from "next/head";
// 👇 React-Bootstrap modules
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
// 👇 Custom modules
import {
  getUsersAsync,
  selectUsers,
  usersActions,
} from "../redux/reducer/usersSlice";
import { selectUser } from "../redux/reducer/userSlice";
import { useAppSelector, useAppDispatch } from "../redux/hooks";
import UserRow from "../components/UserRow";
import {
  collapseElement,
  Progress,
  isUserAuthenticated,
} from "../utils/helpers";
import { darkOpacityText, statusStyle, appTitle } from "../utils/constants";

// 👇 ssr: check if user is authorized to manage users
export const getServerSideProps: GetServerSideProps = async (context) => {
  const response = await isUserAuthenticated(context.req);
  if (!response || !response.admin) {
    return {
      redirect: {
        destination: "/?unauthorized",
        permanent: false,
      },
    };
  }
  return { props: {} };
};

const Users: NextPage = () => {
  const dispatch = useAppDispatch();
  const {
    initials: { pending: authenticating },
  } = useAppSelector(selectUser);
  const {
    pending: { get: getPending },
    error: { get: getError, update: updateError },
    result: { get: getResult },
  } = useAppSelector(selectUsers);
  const { clearError } = usersActions;

  useEffect(() => {
    dispatch(clearError());
    if (!authenticating) {
      dispatch(getUsersAsync());
    }
  }, [authenticating]);

  // 👉 console.log("Users");

  return (
    <div>
      <Head>
        <title>{`${appTitle} | Manage users`}</title>
      </Head>

      <Container fluid="lg" className="p-2">
        <Row className={`g-0 text-center p-3 mb-2 bg-white ${darkOpacityText}`}>
          <Col className="text-start">Username</Col>
          <Col className="text-start ps-4">Group</Col>
          <Col xs={2}>Gender</Col>
          <Col xs={2} className="d-sm-block d-none">
            Status
          </Col>
          <Col
            xs={1}
            className="d-flex align-items-center justify-content-end justify-content-sm-center"
          >
            {getPending ? (
              Progress("sm")
            ) : (
              <i
                title="Refresh"
                className="bi bi-arrow-clockwise css-mouse-enter"
                onClick={() => dispatch(getUsersAsync())}
              ></i>
            )}
          </Col>
        </Row>
        {(getError["unknown"] || updateError["unknown"]) && (
          <div className={statusStyle}>
            {collapseElement(
              Boolean(getError["unknown"] || updateError["unknown"]),
              getError["unknown"] || updateError["unknown"],
              "mt-0"
            )}
          </div>
        )}
        {getPending ? (
          <div className={statusStyle}>{Progress()}</div>
        ) : (
          getResult.map((user, idx) => <UserRow key={idx} user={user} />)
        )}
      </Container>
    </div>
  );
};

export default Users;
