/* eslint-disable @typescript-eslint/require-await */
import {S3EventRecord} from 'aws-lambda/trigger/s3';
import {
  DynamoDBClient,
  GetItemCommand,
  GetItemCommandInput,
} from '@aws-sdk/client-dynamodb';
import {marshall} from '@aws-sdk/util-dynamodb';
import {
  lambdaResponse,
  constants,
  ProductTable,
  UpdateItem,
} from '../../lib/utils';

export async function s3Event(event: {Records: S3EventRecord[]}) {
  try {
    // 👇 get productId and slot
    const key = event.Records[0].s3.object.key.split('/');
    const id = key[0];
    const slot = parseInt(key[1]);

    const {productTable} = constants;
    const params: GetItemCommandInput = {
      TableName: productTable,
      Key: marshall({id}),
    };

    // 👇 check if product exists
    const ddbClient = new DynamoDBClient({region: process.env.region});
    const {Item} = await ddbClient.send(new GetItemCommand(params));
    if (!Item) {
      return lambdaResponse({name: 'InvalidProductIdException'}, 400);
    }
    // 👇 set image slot to existing
    const productUpdate: Partial<ProductTable> = {
      [`image_${slot}`]: true,
    };
    // 👇 update product table
    const updateResult = await UpdateItem(
      ddbClient,
      productTable,
      productUpdate,
      {id},
    );
    return lambdaResponse(updateResult, 200);
  } catch (error) {
    return lambdaResponse(error, 500);
  }
}
