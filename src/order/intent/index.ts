/* eslint-disable @typescript-eslint/require-await */
import {
  APIGatewayProxyEventV2,
  APIGatewayProxyResult,
} from 'aws-lambda/trigger/api-gateway-proxy';
import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
} from '@aws-sdk/client-dynamodb';
import {marshall, unmarshall} from '@aws-sdk/util-dynamodb';
import {
  getProductsById,
  imageToSlot,
  LambdaRequestContext,
  lambdaResponse,
  constants,
  Orders,
  OrderTable,
  OrderTableKeys,
  ProductTable,
  UpdateItem,
  validIntNumber,
  KeyValue,
} from '../../../lib/utils';

const {orderTable, cartIntent, cartStatus, orderLogs} = constants;

// 👇 update order amount
const updateAmount = (
  cartOrder: OrderTable,
  products: KeyValue<ProductTable>,
) => {
  cartOrder.amount = 0;
  cartOrder.orders.forEach((order, index) => {
    const product = products[order.productId];
    cartOrder.orders[index].price = product.price;
    cartOrder.orders[index].name = product.name;
    cartOrder.orders[index].category = product.category;
    cartOrder.orders[index].slot = imageToSlot(product);
    cartOrder.amount += product.price * cartOrder.orders[index].count;
  });
  // Round to 2 decimal Places
  cartOrder.amount =
    Math.round((cartOrder.amount + Number.EPSILON) * 100) / 100;
};

// 👇 get order by intent
const getOrderByIntent = async (
  ddbClient: DynamoDBClient,
  user: string,
  intent: string,
  localCart: Orders[],
) => {
  const {Item} = await ddbClient.send(
    new GetItemCommand({
      TableName: orderTable,
      Key: marshall({user, intent}),
      AttributesToGet: [
        'orders',
        'amount',
        'status',
        'location',
        'logs',
        'createdAt',
      ] as OrderTableKeys[],
    }),
  );

  if (intent === cartIntent && localCart instanceof Array && localCart.length) {
    const ids: KeyValue<boolean> = {};
    // Merge local cart Ids
    localCart.forEach(({productId, count}) => {
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

    if (!Item) {
      const products = await getProductsById(Object.keys(ids), ddbClient);
      // Create empty cart
      const cartOrder: OrderTable = {
        createdAt: Date.now(),
        status: cartStatus,
        logs: orderLogs,
        orders: [],
        amount: 0,
        user,
        intent: cartIntent,
      };
      // Add local cart to current cart
      localCart.forEach(({productId, count}) => {
        const product = products[productId];
        if (product) {
          cartOrder.orders.push({
            slot: imageToSlot(product),
            productId: product.id,
            name: product.name,
            category: product.category,
            price: product.price,
            count,
          });
          cartOrder.amount += count * product.price;
        }
      });
      // Round to 2 decimal Places
      cartOrder.amount =
        Math.round((cartOrder.amount + Number.EPSILON) * 100) / 100;

      await ddbClient.send(
        new PutItemCommand({
          TableName: orderTable,
          Item: marshall(cartOrder),
        }),
      );
      return lambdaResponse(cartOrder, 200);
    }

    const cartOrder = unmarshall(Item) as OrderTable;
    // Merge current cart Ids
    cartOrder.orders.forEach(({productId}) => {
      ids[productId] = true;
    });
    const products = await getProductsById(Object.keys(ids), ddbClient);
    // Remove invalid products form cart
    cartOrder.orders = cartOrder.orders.filter(({productId}) =>
      Boolean(products[productId]),
    );
    // Add local cart to current cart
    localCart.forEach(({productId, count}) => {
      const product = products[productId];
      if (product) {
        // Check if order from client is already in the cart else, add it
        const index = cartOrder.orders.findIndex(
          item => item.productId === productId,
        );
        if (index >= 0) {
          const currentCount = cartOrder.orders[index].count;
          cartOrder.orders[index].count = Math.max(currentCount, count);
        } else {
          cartOrder.orders.push({
            slot: imageToSlot(product),
            productId: product.id,
            name: product.name,
            category: product.category,
            price: product.price,
            count,
          });
        }
      }
    });
    // Update cart price, name, category, image and amount
    updateAmount(cartOrder, products);
    await UpdateItem(ddbClient, orderTable, cartOrder, {
      user,
      intent: cartIntent,
    });
    const updatedCart: OrderTable = {
      ...cartOrder,
      user,
      intent,
    };
    return lambdaResponse(updatedCart, 200);
  }

  const cartOrder = (Item ? unmarshall(Item) : {orders: []}) as OrderTable;
  const ids: KeyValue<boolean> = {};
  // Merge current cart Ids
  cartOrder.orders.forEach(({productId}) => {
    ids[productId] = true;
  });
  const idsKeys = Object.keys(ids);
  if (!idsKeys.length) {
    return lambdaResponse(cartOrder, 200);
  }
  const products = await getProductsById(idsKeys, ddbClient);
  // Remove invalid products form cart
  cartOrder.orders = cartOrder.orders.filter(({productId}) =>
    Boolean(products[productId]),
  );
  // Update cart price, name, category, image and amount
  updateAmount(cartOrder, products);
  return lambdaResponse(cartOrder, 200);
};

export async function orderIntent(
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResult> {
  try {
    const claims = event.requestContext
      .authorizer as unknown as LambdaRequestContext;
    const user = claims.lambda.accessPayload.username!;
    const ddbClient = new DynamoDBClient({region: process.env.region});

    // 👇 check if intent is valid
    const intent = event.pathParameters?.intent;
    if (!intent) {
      return lambdaResponse({name: `No Intent Specified`}, 400);
    }

    const requestBody: Orders[] = JSON.parse(event.body || '[]');
    return getOrderByIntent(ddbClient, user, intent, requestBody); // POST /order/{intent}
  } catch (error) {
    return lambdaResponse(error, 500);
  }
}
