/* eslint-disable @typescript-eslint/require-await */
import {
  APIGatewayProxyEventV2,
  APIGatewayProxyResult,
} from 'aws-lambda/trigger/api-gateway-proxy';
import {
  AttributeValue,
  DynamoDBClient,
  QueryCommandInput,
} from '@aws-sdk/client-dynamodb';
import {
  constants,
  lambdaResponse,
  LambdaRequestContext,
  KeyValue,
  validIntNumber,
  PaymentStatus,
  queryItems,
} from '../../lib/utils';

// 👇 get orders
const getOrders = async (
  ddbClient: DynamoDBClient,
  user: string,
  startKey: KeyValue<AttributeValue> | undefined,
  limit: number,
  category?: string,
) => {
  const filter =
    category === 'succeeded'
      ? {
          key: '#status = :status1',
          value1: `PAYMENT ${PaymentStatus[PaymentStatus.SUCCEEDED]}`,
        }
      : category === 'requested'
      ? {
          key: '#status = :status1',
          value1: `PAYMENT ${PaymentStatus[PaymentStatus.CREATED]}`,
        }
      : category === 'canceled'
      ? {
          key: '#status = :status1 OR #status = :status2',
          value1: `PAYMENT ${PaymentStatus[PaymentStatus.FAILED]}`,
          value2: `PAYMENT ${PaymentStatus[PaymentStatus.CANCELED]}`,
        }
      : undefined;

  const attributeNames = {
    '#user': 'user',
    '#intent': 'intent',
  };
  const expressionAttributeNames =
    filter && filter.value1
      ? {'#status': 'status', ...attributeNames}
      : attributeNames;

  const attributeValues = {':user': {S: user}, ':intent': {S: 'pi_'}};
  const expressionAttributeValues =
    filter && filter.value1 && filter.value2
      ? {
          ':status1': {S: filter.value1},
          ':status2': {S: filter.value2},
          ...attributeValues,
        }
      : filter && filter.value1
      ? {
          ':status1': {S: filter.value1},
          ...attributeValues,
        }
      : attributeValues;

  const params: QueryCommandInput = {
    TableName: constants.orderTable,
    KeyConditionExpression: '#user = :user AND begins_with(#intent, :intent)',
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
    FilterExpression: filter && filter.key,
    Limit: constants.readsPerQuery,
    ExclusiveStartKey: startKey,
    ScanIndexForward: false,
  };

  return await queryItems(ddbClient, params, limit);
};

export async function order(
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResult> {
  try {
    /*
    const claims = event.requestContext.authorizer?.jwt.claims;
    if (!claims || claims["token_use"] !== "id") {
        return lambdaResponse({ name: "IdTokenRequiredException" }, 400);
    }
    const user = claims["cognito:username"] as string;
    */
    const claims = event.requestContext
      .authorizer as unknown as LambdaRequestContext;
    const user = claims.lambda.accessPayload.username!;
    const ddbClient = new DynamoDBClient({region: process.env.region});

    const requestBody = JSON.parse(event.body || '{}');
    const params = event.queryStringParameters;

    // 👇 check if query should be limited
    const _limit = params?.limit;
    if (_limit && (!validIntNumber(_limit) || Number(_limit) === 0)) {
      return lambdaResponse({name: 'InvalidLimitException'}, 400);
    }
    // 👇 check if pagination key is provided
    const startKey = event.body
      ? (requestBody as KeyValue<AttributeValue>)
      : undefined;
    const limit = _limit ? Number(_limit) : constants.readsPerQuery;

    // 👇 check if query should be filtered by category
    const category = params?.category;
    return await getOrders(ddbClient, user, startKey, limit, category); // POST /order
  } catch (error) {
    return lambdaResponse(error, 500);
  }
}
