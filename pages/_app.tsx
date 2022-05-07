// 👇 Styles
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "../styles/globals.css";
// 👇 Next.js modules
import { AppProps } from "next/app";
import SSRProvider from "react-bootstrap/SSRProvider";
// 👇 Custom modules
import BackDrop from "../components/BackDrop";
import Provider from "../redux/Provider";

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <Provider>
      <SSRProvider>
        <BackDrop>
          <Component {...pageProps} />
        </BackDrop>
      </SSRProvider>
    </Provider>
  );
}

export default MyApp;
