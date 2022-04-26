import {DynamoDBClient, GetItemCommand} from '@aws-sdk/client-dynamodb';
import {marshall, unmarshall} from '@aws-sdk/util-dynamodb';
import {APIGatewayProxyEventV2, APIGatewayProxyResult} from 'aws-lambda';
import {
  LambdaRequestContext,
  lambdaResponse,
  loadConfig,
  constants,
  OrderTable,
  stripe as Stripe,
  strLower,
  UpdateItem,
} from '../../../lib/utils';

export async function paymentCheckout(
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResult> {
  // 👇 load stripe secret key
  const config = await loadConfig('stripe-secret');
  const stripe = Stripe(config.stripe_api_secret_key);
  try {
    /*
        const session = await stripe.checkout.sessions.create({
          line_items: [{
            price: config.product_bronze_ticket,
            quantity: 1,
          },],
          payment_method_types: ['card'],
          mode: 'payment',
          success_url: config.success_url,
          cancel_url: config.cancel_url,
          shipping_rates: [config.shipping_rate],
          shipping_address_collection: {
            allowed_countries: config.shipping_countries.split(',')
          }
        });
        const response = {
          statusCode: 303,
          headers: {
            'Location': session.url
          }
        };
    
        res = { headers: contentType, body: JSON.stringify({ session, config, }), statusCode: 200 };
    */

    const claims = event.requestContext
      .authorizer as unknown as LambdaRequestContext;
    const user = claims.lambda.accessPayload.username!;
    const ddbClient = new DynamoDBClient({region: process.env.region});
    const {orderTable, cartIntent} = constants;
    const {Item} = await ddbClient.send(
      new GetItemCommand({
        TableName: orderTable,
        Key: marshall({user, intent: cartIntent}),
      }),
    );
    // 👇 check if order is exists
    if (!Item) {
      return lambdaResponse({name: 'NoOrderInCartException'}, 400);
    }
    const item = unmarshall(Item) as OrderTable;
    if (!item.orders.length) {
      return lambdaResponse({name: 'NoOrderException'}, 400);
    }
    // 👇 check if delivery location is valid
    const requestBody = JSON.parse(event.body || '{}') as Partial<OrderTable>;
    if (
      !requestBody.location ||
      !requestBody.location.address ||
      !requestBody.location.country
    ) {
      return lambdaResponse({name: 'InvalidLocationException'}, 400);
    }
    // 👇 update order delivery details
    item.location = requestBody.location;
    delete (item as Partial<OrderTable>).user;
    delete (item as Partial<OrderTable>).intent;
    await UpdateItem(ddbClient, orderTable, item, {
      user,
      intent: cartIntent,
    });

    const amount = item.amount * 100;
    const date = new Date(item.createdAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    // 👇 Create a PaymentIntent with the order amount and currency
    const createIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      description: `Order For ${strLower(
        user,
      )}, Amount: US$${amount}, Date Initiated: ${date}`,
      metadata: {
        user,
      },
    });

    return lambdaResponse(
      {clientSecret: createIntent.client_secret, amount: item.amount},
      200,
    );
  } catch (error) {
    return lambdaResponse(error, 500);
  }
}
