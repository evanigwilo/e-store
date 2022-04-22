/* eslint-disable @typescript-eslint/require-await */
import {
  APIGatewayProxyEventV2,
  APIGatewayProxyResult,
} from 'aws-lambda/trigger/api-gateway-proxy';
import {
  DeleteItemCommand,
  DeleteItemCommandInput,
  DynamoDBClient,
  GetItemCommand,
  GetItemCommandInput,
} from '@aws-sdk/client-dynamodb';
import {marshall, unmarshall} from '@aws-sdk/util-dynamodb';
import {HttpMethod} from 'aws-cdk-lib/aws-events';
import {
  getCredentials,
  lambdaResponse,
  constants,
  ProductTable,
  propTrim,
  strLower,
  supportedCategories,
  UpdateItem,
  validFloatNumber,
} from '../../../lib/utils';

const {productTable} = constants;

// 👇 get product
const getProduct = async (ddbClient: DynamoDBClient, id: string) => {
  const params: GetItemCommandInput = {
    TableName: productTable,
    Key: marshall({id}),
  };
  const {Item} = await ddbClient.send(new GetItemCommand(params));

  return Item
    ? lambdaResponse(unmarshall(Item), 200)
    : {
        body: '',
        statusCode: 204,
      };
};
// 👇 delete product
const deleteProduct = async (ddbClient: DynamoDBClient, id: string) => {
  const params: DeleteItemCommandInput = {
    TableName: productTable,
    Key: marshall({id}),
  };
  const deleteResult = await ddbClient.send(new DeleteItemCommand(params));
  return lambdaResponse(deleteResult, 200);
};
// 👇 update product
const updateProduct = async (
  ddbClient: DynamoDBClient,
  requestBody: Partial<ProductTable>,
  id: string,
) => {
  const params: GetItemCommandInput = {
    TableName: productTable,
    Key: marshall({id}),
  };
  const {Item} = await ddbClient.send(new GetItemCommand(params));
  if (!Item) {
    return lambdaResponse({name: 'InvalidProductIdException'}, 400);
  }
  // 👇 remove whitespaces from product values
  propTrim(requestBody);
  // 👇 check if product values are valid
  if (!requestBody.name)
    return lambdaResponse({name: 'InvalidNameException'}, 400);
  if (!validFloatNumber((requestBody.price || 0).toString()))
    return lambdaResponse({name: 'InvalidPriceException'}, 400);
  const {category} = requestBody;
  if (!category || !supportedCategories.includes(category))
    return lambdaResponse({name: 'InvalidCategoryException'}, 400);

  // 👇 update product
  const productUpdate: Partial<ProductTable> = {
    price: requestBody.price,
    name: strLower(requestBody.name),
    category,
  };
  await UpdateItem(ddbClient, productTable, productUpdate, {id});
  // 👇 return updated product
  const item = unmarshall(Item) as ProductTable;
  item.name = productUpdate.name!;
  item.category = productUpdate.category!;
  item.price = productUpdate.price!;

  return lambdaResponse(item, 200);
};

export async function productId(
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResult> {
  try {
    // 👇 check if productId is valid
    const productId = event.pathParameters?.id;
    if (!productId)
      return lambdaResponse({name: 'InvalidProductIdException'}, 400);

    const requestBody: ProductTable = JSON.parse(event.body || '{}');
    const ddbClient = new DynamoDBClient({region: process.env.region});
    const method = event.requestContext.http.method as HttpMethod;

    switch (method) {
      case HttpMethod.GET:
        break;
      case HttpMethod.DELETE:
      case HttpMethod.PUT:
        // 👇 check if user is authorized to delete or update product
        await getCredentials(
          process.env[`${constants.groups.product}_pool`]!,
          event,
        );
        break;
      default:
        return lambdaResponse({name: `Unsupported route: "${method}"`}, 400);
    }
    switch (method) {
      case HttpMethod.GET:
        return await getProduct(ddbClient, productId); // GET product/{id}
      case HttpMethod.DELETE:
        return await deleteProduct(ddbClient, productId); // DELETE /product/{id}
      case HttpMethod.PUT:
        return await updateProduct(ddbClient, requestBody, productId); // PUT /product/{id}
      default:
        return lambdaResponse({name: `Unsupported route: "${method}"`}, 400);
    }
  } catch (error) {
    return lambdaResponse(error, 500);
  }
}
