/* eslint-disable @typescript-eslint/require-await */
import {
  APIGatewayProxyEventV2,
  APIGatewayProxyResult,
} from 'aws-lambda/trigger/api-gateway-proxy';
import {
  AttributeValue,
  DynamoDBClient,
  QueryCommandInput,
  ScanCommandInput,
} from '@aws-sdk/client-dynamodb';
import {
  lambdaResponse,
  constants,
  strLower,
  KeyValue,
  validIntNumber,
  queryItems,
} from '../../lib/utils';

const {productTable, categoryIndex, readsPerQuery} = constants;

// 👇 get all products
const getAllProducts = async (
  ddbClient: DynamoDBClient,
  search: string,
  limit: number,
  startKey?: KeyValue<AttributeValue>,
) => {
  const params: ScanCommandInput = {
    TableName: productTable,
    Limit: readsPerQuery,
    ExclusiveStartKey: startKey,
    ...(search
      ? {
          FilterExpression:
            'begins_with(#name, :name1) OR contains(#name, :name2)',
          ExpressionAttributeValues: {
            ':name1': {S: search},
            ':name2': {S: ` ${search} `},
          },
          ExpressionAttributeNames: {
            '#name': 'name',
          },
        }
      : undefined),
  };

  return await queryItems(ddbClient, params, limit, false);
};
// 👇 get products by category
const getProductsByCategory = async (
  ddbClient: DynamoDBClient,
  category: string,
  search: string,
  limit: number,
  sort?: string,
  startKey?: KeyValue<AttributeValue>,
) => {
  const params: QueryCommandInput = {
    TableName: productTable,
    IndexName: categoryIndex,
    KeyConditionExpression: 'category = :productCategory',
    Limit: readsPerQuery,
    ExclusiveStartKey: startKey,
    ScanIndexForward: sort === 'low',
    ...(search
      ? {
          FilterExpression:
            'begins_with(#name, :name1) OR contains(#name, :name2)',
          ExpressionAttributeValues: {
            ':name1': {S: search},
            ':name2': {S: ` ${search} `},
            ':productCategory': {S: category},
          },
          ExpressionAttributeNames: {
            '#name': 'name',
          },
        }
      : {
          ExpressionAttributeValues: {
            ':productCategory': {S: category},
          },
        }),
  };

  return await queryItems(ddbClient, params, limit);
};

export async function products(
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResult> {
  try {
    const requestBody = JSON.parse(event.body || '{}');
    const ddbClient = new DynamoDBClient({region: process.env.region});
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
    const limit = _limit ? Number(_limit) : readsPerQuery;
    // 👇 check if query should be filtered by category
    const category = strLower(params?.category || '');
    const search = strLower(params?.search || '');
    if (category) {
      const sort = params?.sort;
      return await getProductsByCategory(
        ddbClient,
        category,
        search,
        limit,
        sort,
        startKey,
      ); // POST product?category=Phone
    }
    return await getAllProducts(ddbClient, search, limit, startKey); // POST product
  } catch (error) {
    return lambdaResponse(error, 500);
  }
}
