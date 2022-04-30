import {APIGatewayProxyEventV2} from 'aws-lambda/trigger/api-gateway-proxy';
import {
  DeleteItemCommand,
  DynamoDBClient,
  GetItemCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import {marshall} from '@aws-sdk/util-dynamodb';
import {HttpMethod} from 'aws-cdk-lib/aws-events';
import {DeepPartial, supportedCategories} from '../../../../lib/utils';
import {productId} from '../../../../src/product/id';

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
jest.mock('../../../../lib/utils', () => ({
  ...jest.requireActual('../../../../lib/utils'),
  getCredentials: jest
    .fn()
    .mockImplementation(
      (identityPoolId: string, event: APIGatewayProxyEventV2) =>
        event.body ? Promise.resolve() : Promise.reject(),
    ),
}));

describe('ProductID Service', () => {
  afterAll(() => {
    jest.restoreAllMocks();
  });

  const expectError = async (
    event: APIGatewayProxyEventV2,
    errorMsg: string,
  ) => {
    mockConstants.sendSpy.mockClear();
    const response = await productId(event);
    const body = JSON.parse(response.body);
    expect(body.name).toEqual(errorMsg);
    expect(response.statusCode).toEqual(400);
  };
  const expectTruthy = async (
    event: APIGatewayProxyEventV2,
    returnKey: keyof typeof mockConstants = 'result',
  ) => {
    mockConstants.sendSpy.mockClear();
    const response = await productId(event);
    const body = JSON.parse(response.body);
    expect(body).toStrictEqual(mockConstants[returnKey]);
    expect(response.statusCode).toEqual(200);
  };
  it('should throw invalid productId exception', async () => {
    const mEvent: DeepPartial<APIGatewayProxyEventV2> = {
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
  it('should throw credentials error', async () => {
    const mEvent: DeepPartial<APIGatewayProxyEventV2> = {
      requestContext: {
        http: {
          method: HttpMethod.PUT,
        },
      },
      pathParameters: {
        id: 'id',
      },
    };

    mockConstants.sendSpy.mockClear();
    const response = await productId(mEvent as APIGatewayProxyEventV2);
    expect(response.statusCode).toEqual(500);
    // No Db Call
    expect(mockConstants.sendSpy).toHaveBeenCalledTimes(0);
  });
  it('should get products by id', async () => {
    const mEvent: DeepPartial<APIGatewayProxyEventV2> = {
      requestContext: {
        http: {
          method: HttpMethod.GET,
        },
      },
      pathParameters: {
        id: 'id',
      },
    };

    mockConstants.sendSpy.mockImplementation(((command: GetItemCommand) => {
      return Promise.resolve({
        Item: marshall(mockConstants.result),
      });
    }) as any);

    await expectTruthy(mEvent as APIGatewayProxyEventV2);
    // Getting product from Db
    expect(mockConstants.sendSpy).toHaveBeenCalledTimes(1);
  });
  it('should delete/update products by id', async () => {
    const mEvent: DeepPartial<APIGatewayProxyEventV2> = {
      requestContext: {
        http: {
          method: HttpMethod.DELETE,
        },
      },
      pathParameters: {
        id: 'id',
      },
      body: '{}',
    };

    mockConstants.sendSpy.mockImplementation(((command: DeleteItemCommand) =>
      Promise.resolve(mockConstants.success)) as any);

    await expectTruthy(mEvent as APIGatewayProxyEventV2, 'success');
    // Getting product from Db
    expect(mockConstants.sendSpy).toHaveBeenCalledTimes(1);

    mEvent.requestContext!.http!.method = HttpMethod.PUT;
    mEvent.body = JSON.stringify(mockConstants.result);

    mockConstants.sendSpy.mockImplementation(((
      command: GetItemCommand | UpdateItemCommand,
    ) => {
      if ('UpdateExpression' in command.input) {
        // UpdateItemCommand
        return Promise.resolve(mockConstants.result);
      }
      // GetItemCommand
      return Promise.resolve({
        Item: marshall(mockConstants.result),
      });
    }) as any);

    await expectTruthy(mEvent as APIGatewayProxyEventV2);
    // Check and update product in Db
    expect(mockConstants.sendSpy).toHaveBeenCalledTimes(2);
  });
  it('should throw exceptions', async () => {
    const mEvent: DeepPartial<APIGatewayProxyEventV2> = {
      requestContext: {
        http: {
          method: HttpMethod.PUT,
        },
      },
      pathParameters: {
        id: 'id',
      },
      body: JSON.stringify({
        name: '',
      }),
    };

    mockConstants.sendSpy.mockImplementation(((command: GetItemCommand) => {
      return Promise.resolve({
        Item: marshall(mockConstants.result),
      });
    }) as any);

    await expectError(mEvent as APIGatewayProxyEventV2, 'InvalidNameException');
    // Try Getting product from Db
    expect(mockConstants.sendSpy).toHaveBeenCalledTimes(1);

    mEvent.body = JSON.stringify({
      name: 'Samsung',
      category: 'Category',
    });

    await expectError(
      mEvent as APIGatewayProxyEventV2,
      'InvalidCategoryException',
    );

    // Try Getting product from Db
    expect(mockConstants.sendSpy).toHaveBeenCalledTimes(1);

    mEvent.body = JSON.stringify({
      name: 'Samsung',
      category: supportedCategories[0],
      price: '.',
    });
    await expectError(
      mEvent as APIGatewayProxyEventV2,
      'InvalidPriceException',
    );

    // Try Getting product from Db
    expect(mockConstants.sendSpy).toHaveBeenCalledTimes(1);
  });
});
