/* eslint-disable @typescript-eslint/require-await */
import {
  APIGatewayProxyEventV2,
  APIGatewayProxyResult,
} from 'aws-lambda/trigger/api-gateway-proxy';
import {DynamoDBClient, PutItemCommand} from '@aws-sdk/client-dynamodb';
import {marshall} from '@aws-sdk/util-dynamodb';
import {v4 as uuidv4} from 'uuid';
import {
  getCredentials,
  lambdaResponse,
  ProductTable,
  constants,
  propTrim,
  strLower,
  supportedCategories,
  validFloatNumber,
} from '../../lib/utils';

const createProduct = async (
  ddbClient: DynamoDBClient,
  requestBody: Partial<ProductTable>,
) => {
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

  // 👇 create product
  const productCreate: Partial<ProductTable> = {
    id: uuidv4(),
    createdAt: Date.now(),
    // images: [],
    // image_1: false,
    // image_2: false,
    // image_3: false,
    name: strLower(requestBody.name),
    price: requestBody.price,
    category,
  };
  const params = {
    TableName: constants.productTable,
    Item: marshall(productCreate),
  };
  await ddbClient.send(new PutItemCommand(params));
  return lambdaResponse(productCreate, 200);
};

export async function product(
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResult> {
  try {
    const requestBody = JSON.parse(event.body || '{}');
    const ddbClient = new DynamoDBClient({region: process.env.region});

    // 👇 check if user is authorized to create product
    await getCredentials(
      process.env[`${constants.groups.product}_pool`]!,
      event,
    );
    return await createProduct(ddbClient, requestBody as Partial<ProductTable>); // POST /product
  } catch (error) {
    return lambdaResponse(error, 500);
  }
}
