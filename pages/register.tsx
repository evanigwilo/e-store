// 👇 Next.js modules
import { FormEvent, ReactElement, useEffect, useMemo, useState } from "react";
// 👇 Next.js modules
import { GetServerSideProps, NextPage } from "next";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
// 👇 React-Bootstrap modules
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import Dropdown from "react-bootstrap/Dropdown";
// 👇 Email Validator module
import { validate } from "email-validator";
// 👇 Custom modules
import {
  selectUser,
  registerAsync,
  userActions,
} from "../redux/reducer/userSlice";
import { useAppDispatch, useAppSelector } from "../redux/hooks";
import { isUserAuthenticated, progressButton } from "../utils/helpers";
import { appTitle } from "../utils/constants";
import { KeyValue } from "../utils/types";
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
  }
  return { props: {} };
};

const Register: NextPage = () => {
  const dispatch = useAppDispatch();
  const {
    initials: { pending, authenticated },
    error,
  } = useAppSelector(selectUser);
  const { clearError } = userActions;
  const router = useRouter();

  const genderSelect = ["Male", "Female"];
  const [input, setInput] = useState({
    email: "",
    username: "",
    password: "",
    gender: genderSelect[0],
  });
  const [hidePassword, setHidePassword] = useState(true);
  const [nextPage, setNextPage] = useState(false);
  const [valid, setValid] = useState<KeyValue<boolean>>({});
  const validTrue = useMemo(() => {
    const validValues = Object.values(valid);
    return validValues.length && validValues.every(Boolean);
  }, [valid]);

  const [inputMessage, setInputMessage] = useState<
    KeyValue<{ message?: JSX.Element; error: boolean }>
  >({});
  const updateValid = (key: keyof typeof input, value: boolean) =>
    setValid((prev) => ({
      ...prev,
      [key]: value,
    }));
  const updateInput = (key: keyof typeof input, value: string) =>
    setInput((prev) => ({
      ...prev,
      [key]: value,
    }));

  useEffect(() => {
    dispatch(clearError());
  }, []);

  useEffect(() => {
    dispatch(clearError());
    if (authenticated) {
      router.push("/", undefined, { shallow: true });
    }
  }, [authenticated]);

  useEffect(() => {
    const message = error.email || error.username || error.unknown;
    if (!message) {
      return;
    }
    setInputMessage((prev) => ({
      ...prev,
      unknown: {
        error: true,
        message: (
          <span className="d-flex">
            <i className="bi bi-exclamation-triangle-fill me-1"></i>
            {message}
          </span>
        ),
      },
    }));
  }, [error]);

  const viewHint = (key: keyof typeof input | "unknown") => (
    <Form.Text
      style={{ height: "3rem" }}
      className={`d-block mt-1 css-opacity-transition opacity-75 ${
        inputMessage[key]?.error && "text-danger"
      }`}
    >
      {inputMessage[key]?.message}
    </Form.Text>
  );
  const hintMessage = (
    key: keyof typeof valid,
    target: EventTarget & (HTMLInputElement | HTMLTextAreaElement),
    error: boolean,
    message?: ReactElement | "DONE"
  ) => {
    setInputMessage((prev) => ({
      ...prev,
      [key]: {
        error,
        message:
          message === "DONE" ? (
            <span className="d-flex">
              <i className="bi bi-check-circle-fill text-success me-1"></i>
              Nice work.
            </span>
          ) : (
            message && (
              <span className="d-flex">
                <i className="bi bi-exclamation-triangle-fill me-1"></i>
                {message}
              </span>
            )
          ),
      },
    }));

    if (error) {
      target.classList.add("border-danger", "border-1");
    }
  };
  const hint = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    key: keyof typeof input,
    focusOut: boolean
  ) => {
    const { type, target } = e;
    if (type === "change") {
      dispatch(clearError());
    }
    // 👇 update input validity to false
    updateValid(key, false);

    const value = key === "password" ? target.value : target.value.trim();

    // 👇 update input value
    updateInput(key, value);

    target.classList.remove("border-danger", "border-1");

    switch (key) {
      case "email":
        hintMessage(
          key,
          target,
          false,
          <>
            Your email needs to be valid. Only verified
            <br />
            email addresses will be used for signing in.
          </>
        );
        const email = value;

        if (email.length < 1) {
          focusOut && hintMessage(key, target, false);
        } else if (!validate(email)) {
          if (focusOut) {
            hintMessage(key, target, true, <>Please enter a valid email.</>);
          }
        } else {
          hintMessage(key, target, false, "DONE");

          // 👇 update input validity to true
          updateValid(key, true);
        }
        break;
      case "username":
        hintMessage(
          key,
          target,
          false,
          <>
            Your username must be 3 characters or more.
            <br />
            No spaces or be in an email format.
          </>
        );
        const username = value;

        if (username.length < 1) {
          focusOut && hintMessage(key, target, false);
        } else if (username.length < 3) {
          if (focusOut) {
            hintMessage(
              key,
              target,
              true,
              <>Your username must be at least 3 characters.</>
            );
          }
        } else {
          if (username.includes(" ")) {
            if (focusOut) {
              hintMessage(
                key,
                target,
                true,
                <>Your username must not include spaces.</>
              );
            }
          } else if (validate(username)) {
            if (focusOut) {
              hintMessage(
                key,
                target,
                true,
                <>Your username must not be in an email format.</>
              );
            }
          } else {
            hintMessage(key, target, false, "DONE");
            // 👇 update input validity to true
            updateValid(key, true);
          }
        }
        break;
      case "password":
        hintMessage(
          key,
          target,
          false,
          <>
            Your password must be 6 characters or more.
            <br />
            Include multiple words and phrases to make it more secure.
          </>
        );

        const password = value;

        if (password.length < 1) {
          focusOut && hintMessage(key, target, false);
        } else if (password.length < 6) {
          if (focusOut) {
            hintMessage(
              key,
              target,
              true,
              <>
                Your password is not strong enough.
                <br />
                Your password must be at least 6 characters.
              </>
            );
          }
        } else {
          hintMessage(key, target, false, "DONE");
          // 👇 update input validity to true
          updateValid(key, true);
        }
        break;

      default:
        break;
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    dispatch(registerAsync(input));
  };

  // 👉 console.log("Register");

  return (
    <div className="css-page-center py-5">
      <Head>
        <title>Sign Up and Create an Account | {appTitle}</title>
        <meta name="viewport" content="width=device-width"></meta>
        <meta
          name="description"
          content="Sign up to quickly create a new account today and get started shopping in minutes."
        ></meta>
      </Head>

      <Card className="shadow px-4 py-5 css-width-370px">
        <Card.Title className="text-secondary">
          Create your
          <span>
            <Link href="/">
              <a onClick={() => setNextPage(true)}>
                <AppTitle hoverEffect className="h5 ms-1 me-3 " />
              </a>
            </Link>
          </span>
          account
        </Card.Title>

        <Form noValidate onSubmit={handleSubmit}>
          <Form.Group controlId="formEmail">
            <Form.Label className="mt-4">Email</Form.Label>
            <Form.Control
              disabled={pending}
              type="email"
              value={input.email}
              onChange={(e) => hint(e, "email", false)}
              onFocus={(e) => hint(e, "email", false)}
              onBlur={(e) => hint(e, "email", true)}
            />
            {viewHint("email")}
          </Form.Group>

          <Form.Group controlId="formUsername">
            <Form.Label className="mt-2">Username</Form.Label>
            <Form.Control
              disabled={pending}
              type="text"
              value={input.username}
              onChange={(e) => hint(e, "username", false)}
              onFocus={(e) => hint(e, "username", false)}
              onBlur={(e) => hint(e, "username", true)}
            />
            {viewHint("username")}
          </Form.Group>

          <Form.Group controlId="formGender">
            <Form.Label className="mt-2">Gender</Form.Label>
            <Dropdown>
              <Dropdown.Toggle
                disabled={pending}
                id="formGender"
                style={{ borderBottom: "2px solid var(--bs-gray-100)" }}
                className="css-form-input-color text-start w-100 css-hide-drop"
              >
                {input.gender}
                <i className="bi bi-chevron-expand position-absolute top-50 end-0 translate-middle-y pe-2"></i>
              </Dropdown.Toggle>
              <Dropdown.Menu
                translate="no"
                style={{
                  transform: "translateY(2px)",
                  // marginTop: "-2px",
                }}
                className="w-100"
              >
                {genderSelect.map((value, index) => (
                  <Dropdown.Item
                    key={index}
                    onClick={() => updateInput("gender", value)}
                    className="text-body"
                  >
                    {value}
                  </Dropdown.Item>
                ))}
              </Dropdown.Menu>
            </Dropdown>
          </Form.Group>

          <Form.Group controlId="formPassword">
            <Form.Label className="mt-4">Password</Form.Label>
            <div className="position-relative">
              <Form.Control
                disabled={pending}
                style={{
                  ...(input.password.length > 0 && { paddingRight: "2rem" }),
                }}
                type={`${hidePassword ? "password" : "text"}`}
                value={input.password}
                onChange={(e) => hint(e, "password", false)}
                onFocus={(e) => hint(e, "password", false)}
                onBlur={(e) => hint(e, "password", true)}
              />

              <i
                role="button"
                className={`css-form-input-color position-absolute top-50 end-0 translate-middle-y pe-2 ${
                  input.password.length < 1 && "text-white d-none"
                } ${hidePassword ? "bi bi-eye-slash-fill" : "bi bi-eye-fill"}`}
                onClick={() => setHidePassword(!hidePassword)}
              ></i>
            </div>

            {viewHint("password")}
          </Form.Group>

          <Form.Group controlId="formCheck">
            <Form.Check
              disabled={pending}
              className="mt-4"
              type="checkbox"
              label={
                <Form.Text className="mt-2">
                  Get emails about product updates, industry news, and events.
                  If you change your mind, you can unsubscribe at any time
                </Form.Text>
              }
            />
          </Form.Group>

          <Button
            disabled={pending || !validTrue}
            className="w-100 mt-4 mb-1 css-btn-dark"
            type="submit"
          >
            {progressButton(pending, "Create account")}
          </Button>

          {viewHint("unknown")}
        </Form>

        {!pending && (
          <small className="text-center">
            Have an account?
            <Link href="/login">
              <a onClick={() => setNextPage(true)} className="link">
                {" "}
                Sign in
              </a>
            </Link>
          </small>
        )}
      </Card>

      <Loader show={nextPage} />
    </div>
  );
};

export default Register;
