import {
  DynamoDBClient,
  GetItemCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import {marshall} from '@aws-sdk/util-dynamodb';
import {S3EventRecord} from 'aws-lambda/trigger/s3';
import {s3Event} from '../../../src/s3Event';
import {DeepPartial} from '../../../lib/utils';

const mockConstants = {
  sendSpy: jest.spyOn(DynamoDBClient.prototype, 'send'),
  result: {
    $metadata: {
      httpStatusCode: '200',
      requestId: 'requestId',
      attempts: '1',
      totalRetryDelay: '0',
    },
  },
};
describe('S3Event Service', () => {
  afterAll(() => {
    jest.restoreAllMocks();
  });

  const expectError = async (
    event: {Records: S3EventRecord[]},
    errorMsg: string,
  ) => {
    mockConstants.sendSpy.mockClear();
    const response = await s3Event(event);
    const body = JSON.parse(response.body);
    expect(body.name).toEqual(errorMsg);
    expect(response.statusCode).toEqual(400);
  };
  const expectTruthy = async (event: {Records: S3EventRecord[]}) => {
    mockConstants.sendSpy.mockClear();
    const response = await s3Event(event);
    const body = JSON.parse(response.body);
    expect(body).toStrictEqual(mockConstants.result);
    expect(response.statusCode).toEqual(200);
  };

  it('should throw invalid productId exception', async () => {
    const mEvent: DeepPartial<{Records: S3EventRecord[]}> = {
      Records: [
        {
          s3: {
            object: {
              key: 'key/1',
            },
          },
        },
      ],
    };
    mockConstants.sendSpy.mockImplementation(((command: GetItemCommand) => {
      return Promise.resolve({
        Item: undefined,
      });
    }) as any);

    await expectError(
      mEvent as {Records: S3EventRecord[]},
      'InvalidProductIdException',
    );
    // Try Getting product from Db
    expect(mockConstants.sendSpy).toHaveBeenCalledTimes(1);
  });
  it('should update product images', async () => {
    const mEvent: DeepPartial<{Records: S3EventRecord[]}> = {
      Records: [
        {
          s3: {
            object: {
              key: 'key/1',
            },
          },
        },
      ],
    };
    mockConstants.sendSpy.mockImplementation(((
      command: GetItemCommand | UpdateItemCommand,
    ) => {
      if ('UpdateExpression' in command.input) {
        // UpdateItemCommand
        return Promise.resolve(mockConstants.result);
      }
      // GetItemCommand
      return Promise.resolve({
        Item: marshall({
          images: [],
        }),
      });
    }) as any);

    await expectTruthy(mEvent as {Records: S3EventRecord[]});
    // Check if product exist and updating image in db
    expect(mockConstants.sendSpy).toHaveBeenCalledTimes(2);
  });
});
