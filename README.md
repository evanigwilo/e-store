# E-Store Backend Implementation Using Event-driven Serverless Microservice Architecture

[![Test](https://github.com/evanigwilo/e-store/actions/workflows/build-deploy.yml/badge.svg)](https://github.com/evanigwilo/e-store/actions/workflows/build-deploy.yml)<space><space>
[![TypeScript](https://img.shields.io/badge/--3178C6?logo=typescript&logoColor=ffffff)](https://www.typescriptlang.org/)

The __Serverless E-Store Backend__ is an implementation of a serverless backend for an e-commerce website. Functionalities are split across multiple micro-services that communicate through APIs.

__This project is as an inspiration on how to build event-driven serverless microservice on AWS.__ This makes lots of assumptions on the order flow suitable for most e-commerce platform.

_Please note that you may incure AWS charges for deploying the ecommerce platform into your AWS account as not all services used are part of the [free tier](https://aws.amazon.com/free/) and you might exceed the free tier usage limit. To track costs in your AWS account, consider using [AWS Cost Explorer](https://aws.amazon.com/aws-cost-management/aws-cost-explorer/) and [AWS Billing and Cost Management](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/billing-what-is.html). You can also set up a [billing alarm](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/monitor_estimated_charges_with_cloudwatch.html) to get notified of unexpected charges._

You can explore the [Live REST API](https://petstore.swagger.io/?url=https://raw.githubusercontent.com/evanigwilo/e-store/server/resources/api-definition.yml)

## Design Notes

- There are two users with usernames `admin` and `user` with same password `123456`
  - `admin` has full privileges which includes managing products and users
  - `user` has privileges of managing only products
- REST API and CRUD endpoints using AWS Lambda, API Gateway
- User authentication/authorization and verification using AWS Cognito and Amazon Simple Email Service (SES)
- Data persistence with AWS DynamoDB and AWS S3
- Cloud stack development with Infrastructure as code (IaC) using AWS CloudFormation and AWS Cloud Development Kit (AWS CDK)
- Payment processing using Stripe APIs and Webhooks
- Test Driven Development (TDD)

---
## Architecture

### High-level architecture

This is a high-level view of how the different microservice interact with each other. 

<p align="center">
  <img src="/resources/architecture.png" height="400px" alt="High-level Architecture"/>
</p>

---
### AWS Technologies used

__Communication/Messaging__:

* [Amazon API Gateway](https://aws.amazon.com/api-gateway/) for service-to-service synchronous communication (request/response).
* [Amazon Simple Email Service (SES)](https://aws.amazon.com/ses/) send immediate, trigger-based communications from your application to customers, such as account confirmations or password resets.

__Authentication/Authorization__:

* [Amazon Cognito](https://aws.amazon.com/cognito/) for managing and authenticating users, and providing JSON web tokens used by services.
* [AWS Identity and Access Management](https://aws.amazon.com/iam/) for service-to-service authorization, either between microservices (e.g. authorize to call an Amazon API Gateway REST endpoint), or within a microservice (e.g. granting a Lambda function the permission to read from a DynamoDB table).

__Compute__:

* [AWS Lambda](https://aws.amazon.com/lambda/) as serverless compute either behind APIs or to react to asynchronous events.

__Storage__:

* [Amazon DynamoDB](https://aws.amazon.com/dynamodb/) as a scalable NoSQL database for persisting informations.
* [Amazon S3](https://aws.amazon.com/s3/) store data as objects within resources called “buckets” with features that include capabilities to append metadata tags to objects, move and store data.

__CI/CD__:

* [AWS CloudFormation](https://aws.amazon.com/cloudformation/) with [AWS Serverless Application Model](https://aws.amazon.com/serverless/sam/) for defining AWS resources as code in most services.
* [AWS Cloud Development Kit (CDK)](https://aws.amazon.com/cdk/) for defining AWS resources as code.

__Networking/Routing__:

* [AWS Route 53](https://aws.amazon.com/route53/) scalable DNS and Domain Name Registration. It resolves domain names to it's equivalent IP address.
* [AWS Certificate Manager (ACM)](https://aws.amazon.com/acm/) makes it easy to provision, manage, deploy, and renew SSL/TLS certificates

__Management__:

* [AWS Systems Manager](https://aws.amazon.com/systems-manager/) with [Parameter Store](https://aws.amazon.com/systems-manager/features/#Parameter_Store/) provides a centralized store to manage your configuration data, whether plain-text data such as database strings or secrets such as passwords.

__Monitoring__:

* [Amazon CloudWatch](https://aws.amazon.com/cloudwatch/) for metrics, dashboards, log aggregation.

### Lambda services

|  Services  | Description                               |
|------------|-------------------------------------------|
| auth | Gets user attributes for the current authenticated user. |
| register | Registers and authenticates users. |
| login | Logs in and authenticates users. |
| logout | Logs out the current authenticated user. |
| verify | Sends or verifies user using code sent via email. |
| refresh | Refreshes tokens using refresh token from cookie. |
| category | Gets supported product categories. |
| country | Gets supported countries for delivery. |
| products | Query/Search for products. |
| product/{id} | Manages a product such creating, updating and deleting. |
| order | Query/Search for orders. |
| order/create | Manages an order such creating, updating and deleting. |
| order/{intent} | Gets an order by intent such as `cart` or payment intent. |
| payment/checkout | Checkouts an order. |
| payment/hook | Webhook for updating payment processing. |
| users | Gets users. |
| user-group/{groupname} | Manages user groups such as adding and removing. |

## Other Technologies Used

__Payment__:

* [Stripe | Payment Processing Platform](https://stripe.com/) with [Webhooks](https://stripe.com/docs/webhooks) notifies application using HTTPS when an event happens; used for asynchronous events such as when a customer’s bank confirms a payment, a customer disputes a charge, a recurring payment succeeds, or when collecting subscription payments.

---
## Requirements

Before getting started, make sure you have the following requirements:

- Your own [Stripe account](https://stripe.com/)
- Your own [AWS account](https://aws.amazon.com/free)
- An AWS user with Admin access and Programmatic Access
- The [AWS Command Line Interface](https://aws.amazon.com/cli) installed **and configured for your user**
- The [AWS CDK Toolkit](https://docs.aws.amazon.com/cdk/v2/guide/cli.html) which is the primary tool for interacting with your AWS CDK app
- [Node.js](https://nodejs.org) (v16 or higher)
- A [bash](https://www.gnu.org/software/bash) compatible shell

>Note: Make sure that your AWS Profile has been configured properly, run the below command to view profiles:

```bash
aws configure list-profiles
```

### Run The Project

Follow these steps to get your development environment set up:

1. **Clone this repository** locally;

```bash
# Change to the desired directory
$ cd <desired-directory>

# Clone the repo
$ git clone https://github.com/evanigwilo/e-store.git

# Change to the project directory
$ cd e-store

# Checkout to the server branch
$ git checkout server

# Install dependencies
npm install
```

2. Change AWS profile name in **package.json** file at `"cdk": "cdk --profile aws-cli-v2"` from `aws-cli-v2` to your configured profile name

3. At the root directory, run below command:
```bash
npm run cdk -- deploy
```
4. Wait for provision of all microservices into aws cloud. That’s it!

5. At the root directory, in **cdk-outputs.json** file, the API url can be found with the key `apiUrl`

>Note: Make sure your [Stripe API secret key](https://stripe.com/docs/keys) and [Webhook secret](https://stripe.com/docs/webhooks/quickstart) are stored in [Parameter Store](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html) with the parameter name `stripe-secret` and keys `stripe_api_secret_key` and `webhook_signing_secret` for webhooks to function properly.

>I've hidden the values of my keys below, but this is the JSON we use to store our data for Stripe:
```js
{
  "stripe_api_secret_key":"sk_test_51JU2XXXXXXXXXXXX", // stripe API secret key
  "webhook_signing_secret":"whsec_TqW4TXXXXXXXXXXXX", // stripe webhook signing secret
}
```
## Useful commands

* `npm run build` compile typescript to js
* `npm run watch` watch for changes and compile
* `npm run test` perform the jest unit tests
* `npm run cdk -- deploy` deploy this stack to your default AWS account/region
* `npm run cdk -- diff` compare deployed stack with current state
* `npm run cdk -- synth` emits the synthesized CloudFormation template
* `npm run cdk -- destroy` deletes the CloudFormation stacks created by this project


## References
> [Amazon Web Services | Cloud Computing Services](https://aws.amazon.com/)

> [Stripe | Payment Processing Platform](https://stripe.com/)

> [Swagger: API Documentation & Design Tools for Teams](https://swagger.io/specification/)

