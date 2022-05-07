// 👇 React modules
import { FormEvent, useState, useEffect } from "react";
// 👇 Next.js modules
import { NextPage, GetServerSideProps } from "next";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
// 👇 React-Bootstrap modules
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import Collapse from "react-bootstrap/Collapse";
// 👇 Custom modules
import {
  selectUser,
  loginAsync,
  userActions,
} from "../redux/reducer/userSlice";
import { useAppDispatch, useAppSelector } from "../redux/hooks";
import { appTitle } from "../utils/constants";
import { isUserAuthenticated, progressButton } from "../utils/helpers";
import AppTitle from "../components/AppTitle";
import Loader from "../components/Loader";

// 👇 ssr: check if user is already logged in
export const getServerSideProps: GetServerSideProps = async (context) => {
  const authenticated = await isUserAuthenticated(context.req);
  if (authenticated) {
    return {
      redirect: {
        destination: "/?logged",
        permanent: false,
      },
    };
    //res.writeHead(307, { Location: "/" }).end();
  }
  return { props: {} };
};

const Login: NextPage = () => {
  const [nextPage, setNextPage] = useState(false);
  const [identity, setIdentity] = useState("");
  const [password, setPassword] = useState("");
  const [hidePassword, setHidePassword] = useState(true);
  const router = useRouter();

  const dispatch = useAppDispatch();
  const {
    initials: { pending, authenticated },
    error,
  } = useAppSelector(selectUser);
  const { clearError } = userActions;

  useEffect(() => {
    dispatch(clearError());
    if (authenticated) {
      router.push("/", undefined, { shallow: true });
    }
  }, [authenticated]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    dispatch(
      loginAsync({
        identity,
        password,
      })
    );
  };

  const viewHint = (key: "identity" | "password" | "unknown") => (
    <Collapse in={Boolean(error[key])}>
      <Form.Text
        style={{ height: "2.5rem" }}
        className="mt-1 css-opacity-transition opacity-75 text-danger"
      >
        <span className="pt-1 d-flex">
          <i className="bi bi-exclamation-triangle-fill me-1"></i>
          {error[key]}
        </span>
      </Form.Text>
    </Collapse>
  );

  // 👉 console.log("Login");

  return (
    <div className="css-page-center">
      <Head>
        <title>{`Login | Sign in to the ${appTitle} Dashboard`}</title>
        <meta name="viewport" content="width=device-width"></meta>
        <meta
          name="description"
          content={`Sign in to the ${appTitle} Dashboard to manage business payments and operations in your account. Manage payments and refunds, respond to disputes and more.`}
        ></meta>
      </Head>

      <Card className="shadow px-4 py-5 css-width-370px">
        <Card.Title className="text-secondary">
          Sign in to your
          <span>
            <Link href="/">
              <a onClick={() => setNextPage(true)} className="link">
                <AppTitle hoverEffect className="h5 ms-1 me-3 " />
              </a>
            </Link>
          </span>
          account
        </Card.Title>

        <Form noValidate onSubmit={handleSubmit}>
          <Form.Group controlId="formIdentity">
            <Form.Label className="mt-4">Username or Email</Form.Label>
            <Form.Control
              type="text"
              value={identity}
              onChange={({ target }) => setIdentity(target.value.trim())}
              disabled={pending}
            />
            {viewHint("identity")}
          </Form.Group>

          <Form.Group controlId="formPassword">
            <Form.Label className="mt-4">Password</Form.Label>

            <div className="position-relative">
              <Form.Control
                style={{
                  ...(password.length > 0 && { paddingRight: "2rem" }),
                }}
                type={`${hidePassword ? "password" : "text"}`}
                value={password}
                onChange={({ target }) => setPassword(target.value)}
                disabled={pending}
              />

              <i
                role="button"
                className={`position-absolute top-50 end-0 translate-middle-y pe-2
                css-form-input-color ${
                  password.length < 1 && "text-white d-none"
                } 
              ${hidePassword ? "bi bi-eye-slash-fill" : "bi bi-eye-fill"}`}
                onClick={() => setHidePassword(!hidePassword)}
              ></i>
            </div>

            {viewHint("password")}
          </Form.Group>

          <Button
            disabled={pending || identity.length < 3 || password.length < 6}
            className="w-100 mt-4 mb-2 css-btn-dark"
            type="submit"
          >
            {progressButton(pending, "Continue")}
          </Button>
          {viewHint("unknown")}
        </Form>

        <small className={`text-center mt-3 ${pending && "invisible"}`}>
          {"Don't have an account?"}
          <Link href="/register">
            <a onClick={() => setNextPage(true)} className="link">
              {" "}
              Sign up
            </a>
          </Link>
        </small>
      </Card>

      <Loader show={nextPage} />
    </div>
  );
};

export default Login;
