# E-Store Frontend Implementation Using Next.js Server-side Rendering

[![Test](https://github.com/evanigwilo/e-store/actions/workflows/build-deploy.yml/badge.svg)](https://github.com/evanigwilo/e-store/actions/workflows/build-deploy.yml)<space><space>
[![TypeScript](https://img.shields.io/badge/--3178C6?logo=typescript&logoColor=ffffff)](https://www.typescriptlang.org/)

The __E-Store Frontend__ is an implementation for the client side of the [serverless backend](https://github.com/evanigwilo/e-store/tree/server) for an e-commerce website. 

The website displays products. Users can add and remove products to/from their cart while also specifying the quantity of each item. They can then enter their address and [Stripe](https://stripe.com/) handles the payment processing.

You can check the [Live Demo](https://app.e-store.gq/)

<p align="middle">
  <img src="/capture/1.jpg" width="63%" height='512px' />
  <img src="/capture/2.jpg" width="33%" height='512px' />
</p>

## Design Notes

- Cart persists
  - Users are able to add items to the cart without logging in (an "anonymous cart"), and that cart should persist on browser storage.
  - When logging in, if there were products in an anonymous cart, they are added or updated to the user's cart from any previous logged in sessions.
  - When logging out, the products in the anonymous cart are removed.
  - When updating cart items, items attributes in the anonymous cart such as name, price or category are updated to the recent attributes
- User authentication and authorization using cookies
- Users with admin access can manage products and users
- Users with product access can manage only products
- Payment processing using Stripe Card Element
- Search for products (including by categories)
- Responsive web design
- Test Driven Development (TDD)

## Technologies Used
- E-Store [REST API](https://petstore.swagger.io/?url=https://raw.githubusercontent.com/evanigwilo/e-store/server/resources/api-definition.yml)
- Next.js (+SSR)
- React
- React Testing Library / Jest
- React Bootstrap
- React Stripe Js
- React Intersection Observer
- Redux Toolkit
- Redux-Persist
- Swiper Slider
- Numeral.js
- Axios
- Others...

---
## Requirements

Before getting started, make sure you have the following requirements:
- [Node.js](https://nodejs.org) (v16 or higher)
- [Yarn Package Manager](https://yarnpkg.com/)
- A [bash](https://www.gnu.org/software/bash) compatible shell

---
## Installation
1. Fork this repo into your own GitHub
2. or Clone the repo to your local machine

```bash
# Change to the desired directory
$ cd <desired-directory>

# Clone the repo
$ git clone https://github.com/evanigwilo/e-store.git

# Change to the project directory
$ cd e-store

# Checkout to the client branch
$ git checkout client
```
3. Rename `env.local.sample` to `.env.local` and `env.test.local.sample` to `.env.test.local`

4. Install dependencies
```bash
yarn install
```

5. Run app
```bash
yarn run dev
```

>Note: The [E-Store backend](https://github.com/evanigwilo/e-store/tree/server) was built with a custom domain of `.e-store.gq`. Below are the steps for cookies to work on local machine:

1. [Modify your hosts file](https://support.managed.com/kb/a683/how-to-modify-your-hosts-file-so-you-can-work-on-a-site-that-is-not-yet-live.aspx) and add `127.0.0.1 en.e-store.gq`
2. Use [mkcert](https://github.com/FiloSottile/mkcert) to generate locally-trusted self-signed development certificates for `en.e-store.gq`

```bash
# Generate locally-trusted self-signed certificates
mkcert en.e-store.gq
```

3. Copy the generated certificate `"en.e-store.gq.pem"` and key `"en.e-store.gq-key.pem"` to the `./ssl_keys` folder

4. Start app using [local-ssl-proxy](https://www.npmjs.com/package/local-ssl-proxy) to run with ssl proxy using self-signed trusted certificate
```bash
# Run app with ssl proxy 
yarn run dev-https
```

## Local Development
After this initial set-up, client should be running at : `http://localhost:3000/` or `https://en.e-store.gq:3000/` if running with ssl proxy

---
## References
> [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.

> [Redux Toolkit ](https://redux-toolkit.js.org/)

> [Bootstrap CSS framework](https://getbootstrap.com/)

> [Stripe | Payment Processing Platform](https://stripe.com/)

> [Stripe Publishable API key](https://stripe.com/docs/keys)

> [Vercel Deployment Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme)
