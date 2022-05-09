// 👇 React modules
import { FormEvent, useState, useEffect } from "react";
// 👇 Next.js modules
import { NextPage, GetServerSideProps } from "next";
import Head from "next/head";
// 👇 React-Bootstrap modules
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import Collapse from "react-bootstrap/Collapse";
// 👇 Custom modules
import {
  selectUser,
  verifyAsync,
  userActions,
} from "../redux/reducer/userSlice";
import {
  collapseElement,
  isUserAuthenticated,
  progressButton,
} from "../utils/helpers";
import { useAppDispatch, useAppSelector } from "../redux/hooks";
import { appTitle } from "../utils/constants";

// 👇 ssr: check if user is verified
export const getServerSideProps: GetServerSideProps = async (context) => {
  const response = await isUserAuthenticated(context.req);
  if (response && response.emailVerified) {
    return {
      redirect: {
        destination: "/?verified",
        permanent: false,
      },
    };
  }
  return { props: {} };
};

const Verify: NextPage = () => {
  const [code, setCode] = useState("");
  const [openCodeInput, setOpenCodeInput] = useState(false);

  const dispatch = useAppDispatch();
  const {
    initials: { pending, emailVerified },
    error,
  } = useAppSelector(selectUser);
  const { clearError } = userActions;

  useEffect(() => {
    dispatch(clearError());
  }, [openCodeInput, emailVerified]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    dispatch(
      verifyAsync({
        method: "VERIFY",
        code,
      })
    );
  };

  // 👉 console.log("Verify");

  return (
    <div className="css-page-center">
      <Head>
        <title>{`${appTitle} | Verify your email address`}</title>
      </Head>

      <Card className="shadow px-4 py-5 css-width-370px">
        <Button
          onClick={() =>
            dispatch(verifyAsync({ method: "SEND" }))
              .unwrap()
              .then(() => setOpenCodeInput(true))
              .catch(() => null)
          }
          disabled={pending || openCodeInput}
          className="w-100 css-btn-dark"
        >
          {progressButton(
            pending && !openCodeInput,
            openCodeInput ? "Code sent." : "Send code (Email)"
          )}
        </Button>

        <Collapse in={openCodeInput}>
          <Form data-testid="form-verify" noValidate onSubmit={handleSubmit}>
            <Form.Group controlId="formCode">
              <Form.Label className="mt-4">Ender Code</Form.Label>
              <Form.Control
                type="number"
                inputMode="numeric"
                value={code}
                onChange={({ target }) => setCode(target.value)}
                disabled={pending}
                className="css-hide-arrows"
              />
            </Form.Group>

            <Button
              disabled={pending || code.length < 6 || emailVerified}
              className="w-100 mt-4 mb-2 css-btn-dark"
              type="submit"
            >
              {emailVerified ? (
                <div className="fw-bold">
                  Verified
                  <i className="bi bi-check-lg"></i>
                </div>
              ) : (
                progressButton(pending, "Verify")
              )}
            </Button>
          </Form>
        </Collapse>
        {error["unknown"] &&
          collapseElement(Boolean(error["unknown"]), error["unknown"])}
      </Card>
    </div>
  );
};

export default Verify;
