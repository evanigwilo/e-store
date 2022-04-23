/* eslint-disable @typescript-eslint/require-await */
import {
  APIGatewayProxyEventV2,
  APIGatewayProxyResult,
} from 'aws-lambda/trigger/api-gateway-proxy';
import {
  DynamoDBClient,
  PutItemCommand,
  GetItemCommand,
} from '@aws-sdk/client-dynamodb';
import {marshall} from '@aws-sdk/util-dynamodb';
import {
  UpdateItem,
  OrderTable,
  constants,
  lambdaResponse,
  LambdaRequestContext,
  validIntNumber,
  Orders,
  imageToSlot,
  getProductsById,
  OrderTableKeys,
  KeyValue,
} from '../../../lib/utils';

// 👇 create order
const createOrder = async (
  ddbClient: DynamoDBClient,
  orders: Orders[],
  user: string,
) => {
  // check if order is valid
  if (!(orders instanceof Array))
    return lambdaResponse({name: 'InvalidOrderException'}, 400);

  const {orderTable, cartIntent, orderLogs, cartStatus} = constants;

  const createUpdate: Partial<OrderTable> = {
    createdAt: Date.now(),
    status: cartStatus,
    logs: orderLogs,
    orders: [],
    amount: 0,
  };

  const ids: KeyValue<boolean> = {};
  orders.forEach(({productId, count}) => {
    if (
      // Remove order with invalid count
      productId &&
      count &&
      validIntNumber(count.toString()) &&
      count > 0
    ) {
      ids[productId] = true;
    }
  });
  const products = await getProductsById(Object.keys(ids), ddbClient);
  // Add valid products to cart
  orders.forEach(({productId, count}) => {
    const product = products[productId];
    if (product) {
      createUpdate.orders!.push({
        slot: imageToSlot(product),
        productId: product.id,
        name: product.name,
        category: product.category,
        price: product.price,
        count,
      });
      createUpdate.amount! += count * product.price;
    }
  });
  // Round to 2 decimal Places
  createUpdate.amount =
    Math.round((createUpdate.amount! + Number.EPSILON) * 100) / 100;

  /*
    if (createUpdate.orders!.length === 0)
    return lambdaResponse({name: 'NoOrderAfterProcessingException'}, 400);
  */
  const {Item} = await ddbClient.send(
    new GetItemCommand({
      TableName: orderTable,
      Key: marshall({user, intent: cartIntent}),
      AttributesToGet: ['intent'] as OrderTableKeys[],
    }),
  );

  if (!Item) {
    createUpdate.user = user;
    createUpdate.intent = cartIntent;
    await ddbClient.send(
      new PutItemCommand({
        TableName: orderTable,
        Item: marshall(createUpdate),
      }),
    );
  } else {
    await UpdateItem(ddbClient, orderTable, createUpdate, {
      user,
      intent: cartIntent,
    });
    createUpdate.user = user;
    createUpdate.intent = cartIntent;
  }
  return lambdaResponse(createUpdate, 200);
};

export async function orderCreate(
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResult> {
  try {
    const claims = event.requestContext
      .authorizer as unknown as LambdaRequestContext;

    const user = claims.lambda.accessPayload.username!;
    const requestBody: Orders[] = JSON.parse(event.body || '[]');
    const ddbClient = new DynamoDBClient({region: process.env.region});

    return await createOrder(ddbClient, requestBody, user); // POST /order/create
  } catch (error) {
    return lambdaResponse(error, 500);
  }
}
