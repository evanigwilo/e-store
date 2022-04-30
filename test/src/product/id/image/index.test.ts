import {DynamoDBClient, GetItemCommand} from '@aws-sdk/client-dynamodb';
import {marshall} from '@aws-sdk/util-dynamodb';
import {HttpMethod} from 'aws-cdk-lib/aws-events';
import {APIGatewayProxyEventV2} from 'aws-lambda/trigger/api-gateway-proxy';
// import S3, { PresignedPost } from 'aws-sdk/clients/s3';
import * as utils from '../../../../../lib/utils';
import {productImage} from '../../../../../src/product/id/image';

const mockConstants = {
  getCredentialsSpy: jest.spyOn(utils, 'getCredentials'),
  sendSpy: jest.spyOn(DynamoDBClient.prototype, 'send'),
  result: '',
};

jest.mock('aws-sdk/clients/s3', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => {
    return {
      createPresignedPost: () => Promise.resolve(mockConstants.result),
      deleteObject: () => {
        return {
          promise: () => Promise.resolve(mockConstants.result),
        };
      },
    };
  }),
}));

describe('ProductImage Service', () => {
  beforeEach(() => {
    mockConstants.getCredentialsSpy.mockImplementation((() =>
      Promise.resolve()) as any);
    mockConstants.sendSpy.mockImplementation(((command: GetItemCommand) => {
      return Promise.resolve({
        Item: marshall({
          images: [],
        }),
      });
    }) as any);
  });
  afterAll(() => {
    jest.restoreAllMocks();
  });

  const expectError = async (
    event: APIGatewayProxyEventV2,
    errorMsg: string,
  ) => {
    mockConstants.sendSpy.mockClear();
    const response = await productImage(event);
    const body = JSON.parse(response.body);
    expect(body.name).toEqual(errorMsg);
    expect(response.statusCode).toEqual(400);
  };
  const expectTruthy = async (event: APIGatewayProxyEventV2) => {
    mockConstants.sendSpy.mockClear();
    const response = await productImage(event);
    const body = JSON.parse(response.body);
    expect(body).toStrictEqual(mockConstants.result);
    expect(response.statusCode).toEqual(200);
  };

  it('should throw credentials error', async () => {
    const mEvent: utils.DeepPartial<APIGatewayProxyEventV2> = {
      pathParameters: {
        id: 'productId',
      },
      body: JSON.stringify({
        fileType: 'image/png',
      }),
    };

    mockConstants.getCredentialsSpy.mockImplementation((() =>
      Promise.reject()) as any);
    const response = await productImage(mEvent as APIGatewayProxyEventV2);
    expect(response.statusCode).toEqual(500);
    // No Db Call
    expect(mockConstants.sendSpy).toHaveBeenCalledTimes(0);
  });
  it('should throw invalid productId exception', async () => {
    const mEvent: utils.DeepPartial<APIGatewayProxyEventV2> = {
      pathParameters: {
        id: '',
      },
    };
    await expectError(
      mEvent as APIGatewayProxyEventV2,
      'InvalidProductIdException',
    );
    // No Db Call
    expect(mockConstants.sendSpy).toHaveBeenCalledTimes(0);
  });
  it('should throw invalid slot exception', async () => {
    const mEvent: utils.DeepPartial<APIGatewayProxyEventV2> = {
      pathParameters: {
        id: 'productId',
      },
      body: JSON.stringify({
        fileType: 'image/png',
      }),
      queryStringParameters: {
        slot: '0',
      },
    };
    await expectError(mEvent as APIGatewayProxyEventV2, 'InvalidSlotException');
    // No Db Call
    expect(mockConstants.sendSpy).toHaveBeenCalledTimes(0);
  });
  it('should throw no product with id exception', async () => {
    const mEvent: utils.DeepPartial<APIGatewayProxyEventV2> = {
      pathParameters: {
        id: 'productId',
      },
      body: JSON.stringify({
        fileType: 'image/png',
      }),
      queryStringParameters: {
        slot: '1',
      },
    };
    mockConstants.sendSpy.mockImplementation(((command: GetItemCommand) => {
      return Promise.resolve({
        Item: undefined,
      });
    }) as any);

    await expectError(
      mEvent as APIGatewayProxyEventV2,
      'NoProductWithIdException',
    );
    // Try Getting Product from Db
    expect(mockConstants.sendSpy).toHaveBeenCalledTimes(1);
  });
  it('should throw invalid fileType exception', async () => {
    const mEvent: utils.DeepPartial<APIGatewayProxyEventV2> = {
      requestContext: {
        http: {
          method: HttpMethod.POST,
        },
      },
      pathParameters: {
        id: 'productId',
      },
      body: JSON.stringify({
        fileType: 'image/',
      }),
      queryStringParameters: {
        slot: '1',
      },
    };
    await expectError(
      mEvent as APIGatewayProxyEventV2,
      'InvalidFileTypeException',
    );
    // Check if product exist
    expect(mockConstants.sendSpy).toHaveBeenCalledTimes(1);
  });
  it('should create presigned post url for file upload', async () => {
    const mEvent: utils.DeepPartial<APIGatewayProxyEventV2> = {
      requestContext: {
        http: {
          method: HttpMethod.POST,
        },
      },
      pathParameters: {
        id: 'productId',
      },
      body: JSON.stringify({
        fileType: 'image/png',
      }),
      queryStringParameters: {
        slot: '1',
      },
    };

    // jest.spyOn(S3.prototype, 'createPresignedPost').mockImplementation(((params: PresignedPost.Params) => {
    //     return Promise.resolve(mockConstants.result);
    // }) as any);

    await expectTruthy(mEvent as APIGatewayProxyEventV2);
    // Check if product exist
    expect(mockConstants.sendSpy).toHaveBeenCalledTimes(1);
  });
  it('should delete product image', async () => {
    const mEvent: utils.DeepPartial<APIGatewayProxyEventV2> = {
      requestContext: {
        http: {
          method: HttpMethod.DELETE,
        },
      },
      pathParameters: {
        id: 'productId',
      },
      body: JSON.stringify({
        fileType: 'image/png',
      }),
      queryStringParameters: {
        slot: '1',
      },
    };
    // jest.spyOn(S3.prototype, 'deleteObject').mockImplementation(((params: PresignedPost.Params) => {
    //     return Promise.resolve(mockConstants.result);
    // }) as any);
    mockConstants.sendSpy.mockClear();
    const response = await productImage(mEvent as APIGatewayProxyEventV2);
    const body = JSON.parse(response.body);
    expect(body).toStrictEqual({
      updateResult: {
        Item: marshall({
          images: [],
        }),
      },
      deleteResult: mockConstants.result,
    });
    expect(response.statusCode).toEqual(200);
    // Check if product exist and deleting image from db
    expect(mockConstants.sendSpy).toHaveBeenCalledTimes(2);
  });
});
