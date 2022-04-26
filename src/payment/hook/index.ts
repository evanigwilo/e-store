import {
  DynamoDBClient,
  GetItemCommand,
  TransactWriteItemsCommand,
  TransactWriteItemsCommandInput,
  UpdateItemCommand,
  UpdateItemCommandInput,
} from '@aws-sdk/client-dynamodb';
import {marshall, unmarshall} from '@aws-sdk/util-dynamodb';
import {APIGatewayProxyEventV2, APIGatewayProxyResult} from 'aws-lambda';
import {
  loadConfig,
  OrderTable,
  constants,
  stripe as Stripe,
  lambdaResponse,
  PaymentStatus,
} from '../../../lib/utils';

interface SellerMessage {
  outcome: {
    seller_message: string;
  };
}
interface Session {
  id: string;
  metadata: {
    user: string;
  };
  charges: {
    data: SellerMessage[];
  };
}

const updatePaymentStatus = async function (
  status: PaymentStatus,
  session: Session,
) {
  const ddbClient = new DynamoDBClient({region: process.env.region});
  const {cartIntent, orderTable} = constants;
  const {user} = session.metadata;
  const intentId = session.id;

  // 👇 check status of payment
  if (status === PaymentStatus.CREATED) {
    const key = marshall({user, intent: cartIntent});
    const {Item} = await ddbClient.send(
      new GetItemCommand({
        TableName: orderTable,
        Key: key,
      }),
    );
    const theItem = unmarshall(Item!) as OrderTable;
    theItem.createdAt = Date.now();
    theItem.intent = intentId;
    theItem.status = `PAYMENT ${PaymentStatus[status]}`;
    // 👇 Delete Update Cart, because "intent" is a PK which has to be changed to the intentId
    const params: TransactWriteItemsCommandInput = {
      TransactItems: [
        {
          Delete: {
            TableName: orderTable,
            Key: key,
          },
        },
        {
          Put: {
            TableName: orderTable,
            Item: marshall(theItem),
          },
        },
      ],
    };
    const updateResult = await ddbClient.send(
      new TransactWriteItemsCommand(params),
    );
    return lambdaResponse(updateResult, 200);
  } /* if (
    status === PaymentStatus.SUCCEEDED ||
    status === PaymentStatus.CANCELED ||
    status === PaymentStatus.FAILED) */
  const params: UpdateItemCommandInput = {
    TableName: orderTable,
    Key: marshall({user, intent: intentId}),
    UpdateExpression: 'SET #key0 = :value0, #key1 = :value1',
    ExpressionAttributeNames: {'#key0': 'status', '#key1': 'logs'},
    ExpressionAttributeValues: {
      ':value0': {S: `PAYMENT ${PaymentStatus[status]}`},
      ':value1': {
        S:
          session.charges.data[0].outcome.seller_message || constants.orderLogs,
      },
    },
  };
  const updateResult = await ddbClient.send(new UpdateItemCommand(params));
  return lambdaResponse(updateResult, 200);
};

export async function paymentHook(
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResult | any> {
  // 👇 load stripe secret key
  const config = await loadConfig('stripe-secret');
  const stripe = Stripe(config.stripe_api_secret_key);
  try {
    const sig = event.headers['stripe-signature'];
    // 👇 require Stripe signature in header
    if (!sig) {
      return lambdaResponse(
        {
          name: 'no Stripe signature received in header, returning 400 Bad Request',
        },
        400,
      );
    }
    // 👇 require an event body
    if (!event.body) {
      return lambdaResponse(
        {name: 'no event body received in POST, returning 400 Bad Request'},
        400,
      );
    }
    // 👇 decode payload
    const payload = event.isBase64Encoded
      ? Buffer.from(event.body, 'base64').toString()
      : event.body;
    // 👇 construct a Stripe Webhook event
    const ev = stripe.webhooks.constructEvent(
      payload,
      sig,
      config.webhook_signing_secret,
    );
    const session = ev.data.object as Session;

    switch (ev.type) {
      // 👇 The order is processing
      case 'payment_intent.created':
        return await updatePaymentStatus(PaymentStatus.CREATED, session);
      // 👇 The order is paid successfully (e.g., from a card payment)
      case 'payment_intent.succeeded':
        return await updatePaymentStatus(PaymentStatus.SUCCEEDED, session);
      // 👇  The order has failed
      case 'payment_intent.payment_failed':
        return await updatePaymentStatus(PaymentStatus.FAILED, session);
      // 👇 The order has canceled
      case 'payment_intent.canceled':
        return await updatePaymentStatus(PaymentStatus.CANCELED, session);
    }
  } catch (error) {
    return lambdaResponse(error, 500);
  }
}
