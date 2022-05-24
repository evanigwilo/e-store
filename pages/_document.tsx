import Document, {
  Html,
  Head,
  Main,
  NextScript,
  DocumentContext,
} from "next/document";

class MyDocument extends Document {
  static async getInitialProps(ctx: DocumentContext) {
    const initialProps = await Document.getInitialProps(ctx);
    return initialProps;
  }

  render() {
    return (
      <Html>
        <Head>
          {/* <link rel="icon" href="/favicon.ico" /> */}
          <link
            rel="icon"
            type="image/png"
            href="assets/images/shop-basket-3.png"
          />
          <meta charSet="UTF-8" />
          <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
          <meta
            name="description"
            content={
              "Free shipping on millions of items. Get the best of Shopping and Entertainment with Prime. " +
              "Enjoy low prices and great deals on the largest selection of everyday essentials and other products, " +
              "including fashion, home, beauty, electronics, Alexa Devices, sporting goods, toys, automotive, pets, " +
              "baby, books, video games, musical instruments, office supplies, and more."
            }
          />
          <meta
            name="keywords"
            content={
              "Estore, E-Store.com, Books, Online Shopping, Book Store, Magazine, Subscription, " +
              "Music, CDs, DVDs, Videos, Electronics, Video Games, Computers, Cell Phones, " +
              "Toys, Games, Apparel, Accessories, Shoes, Jewelry, Watches, Office Products, Sports"
            }
          />

          {/* <link rel="shortcut icon" type="image/svg+xml" href="/vercel.svg" /> */}
          <meta property="og:site_name" content="e-store" />
          <meta property="twitter:site" content="@e-store" />
          <meta property="twitter:card" content="summary" />
          <meta property="og:type" content="website" />
          <meta
            property="og:image"
            content="assets/images/shop-basket-3.png"
            // content={`${process.env.NEXT_PUBLIC_CLIENT_BASE_URL}/reddit.svg`}
          />
          <meta
            property="twitter:image"
            // content={`${process.env.NEXT_PUBLIC_CLIENT_BASE_URL}/reddit.svg`}
          />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
