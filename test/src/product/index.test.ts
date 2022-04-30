import {APIGatewayProxyEventV2} from 'aws-lambda/trigger/api-gateway-proxy';
import {DynamoDBClient, PutItemCommand} from '@aws-sdk/client-dynamodb';
import {HttpMethod} from 'aws-cdk-lib/aws-events';
import {
  DeepPartial,
  ProductTable,
  supportedCategories,
} from '../../../lib/utils';
import {product} from '../../../src/product';

const mockConstants = {
  sendSpy: jest.spyOn(DynamoDBClient.prototype, 'send'),
  result: {
    category: supportedCategories[0],
    createdAt: 123,
    id: '1',
    price: 100,
    name: 'Iphone',
  },
  success: {
    $metadata: {
      httpStatusCode: '200',
      requestId: 'requestId',
      attempts: '1',
      totalRetryDelay: '0',
    },
  },
};
jest.mock('../../../lib/utils', () => ({
  ...jest.requireActual('../../../lib/utils'),
  loadConfig: jest.fn().mockImplementation(() =>
    Promise.resolve({
      stripe_api_secret_key: 'stripe_api_secret_key',
    }),
  ),
}));
jest.mock('../../../lib/utils', () => ({
  ...jest.requireActual('../../../lib/utils'),
  getCredentials: jest
    .fn()
    .mockImplementation(
      (identityPoolId: string, event: APIGatewayProxyEventV2) =>
        event.body ? Promise.resolve() : Promise.reject(),
    ),
}));

describe('Product Service', () => {
  afterAll(() => {
    jest.restoreAllMocks();
  });

  const expectError = async (
    event: APIGatewayProxyEventV2,
    errorMsg: string,
  ) => {
    mockConstants.sendSpy.mockClear();
    const response = await product(event);
    const body = JSON.parse(response.body);
    expect(body.name).toEqual(errorMsg);
    expect(response.statusCode).toEqual(400);
  };
  const expectTruthy = async (event: APIGatewayProxyEventV2) => {
    mockConstants.sendSpy.mockClear();
    const response = await product(event);
    const body = JSON.parse(response.body) as ProductTable;
    const stateName = expect.getState().currentTestName;
    if (stateName === 'Product Service should create product') {
      expect(body).toStrictEqual({
        ...mockConstants.result,
        id: body.id,
        createdAt: body.createdAt,
      });
    } else {
      expect(body).toStrictEqual(mockConstants.result);
    }
    expect(response.statusCode).toEqual(200);
  };

  it('should throw credentials error', async () => {
    const mEvent: DeepPartial<APIGatewayProxyEventV2> = {
      requestContext: {
        http: {
          method: HttpMethod.POST,
        },
      },
      // headers: {
      //   authorization: 'authorization',
      // },
    };
    const response = await product(mEvent as APIGatewayProxyEventV2);
    expect(response.statusCode).toEqual(500);
    // No Db Call
    expect(mockConstants.sendSpy).toHaveBeenCalledTimes(0);
  });
  it('should create product', async () => {
    const mEvent: DeepPartial<APIGatewayProxyEventV2> = {
      requestContext: {
        http: {
          method: HttpMethod.POST,
        },
      },
      body: JSON.stringify(mockConstants.result),
      // headers: {
      //   authorization: 'authorization',
      // },
    };

    mockConstants.sendSpy.mockImplementation(((command: PutItemCommand) => {
      return Promise.resolve(mockConstants.result);
    }) as any);

    await expectTruthy(mEvent as APIGatewayProxyEventV2);
    // Save order to Db
    expect(mockConstants.sendSpy).toHaveBeenCalledTimes(1);
  });
  it('should throw exceptions', async () => {
    const mEvent: DeepPartial<APIGatewayProxyEventV2> = {
      requestContext: {
        http: {
          method: HttpMethod.POST,
        },
      },
      body: JSON.stringify({
        name: '',
      }),
      // headers: {
      //   authorization: 'authorization',
      // },
    };
    await expectError(mEvent as APIGatewayProxyEventV2, 'InvalidNameException');
    // No Db Call
    expect(mockConstants.sendSpy).toHaveBeenCalledTimes(0);

    mEvent.body = JSON.stringify({
      name: 'Samsung',
      category: 'Category',
    });

    await expectError(
      mEvent as APIGatewayProxyEventV2,
      'InvalidCategoryException',
    );
    // No Db Call
    expect(mockConstants.sendSpy).toHaveBeenCalledTimes(0);

    mEvent.body = JSON.stringify({
      name: 'Samsung',
      category: supportedCategories[0],
      price: '.',
    });
    await expectError(
      mEvent as APIGatewayProxyEventV2,
      'InvalidPriceException',
    );

    // No Db Call
    expect(mockConstants.sendSpy).toHaveBeenCalledTimes(0);
  });
});
