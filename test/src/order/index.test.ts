import {APIGatewayProxyEventV2} from 'aws-lambda/trigger/api-gateway-proxy';
import {DynamoDBClient, QueryCommand} from '@aws-sdk/client-dynamodb';
import {marshall} from '@aws-sdk/util-dynamodb';
import {
  constants,
  DeepPartial,
  LambdaRequestContext,
  OrderTable,
  supportedCategories,
} from '../../../lib/utils';
import {order} from '../../../src/order';

const mockConstants = {
  spySend: jest.spyOn(DynamoDBClient.prototype, 'send'),
  value: {
    queryResult: [] as Partial<OrderTable>[],
  },
};

describe('Get Order Service', () => {
  afterAll(() => {
    jest.restoreAllMocks();
  });

  const expectError = async (
    event: APIGatewayProxyEventV2,
    errorMsg: string,
  ) => {
    mockConstants.spySend.mockClear();
    const response = await order(event);
    const body = JSON.parse(response.body);
    expect(body.name).toEqual(errorMsg);
    expect(response.statusCode).toEqual(400);
  };
  const expectTruthy = async (event: APIGatewayProxyEventV2) => {
    mockConstants.spySend.mockClear();
    const response = await order(event);
    const body = JSON.parse(response.body);
    expect(body).toStrictEqual(mockConstants.value);
    expect(response.statusCode).toEqual(200);
  };
  /*
  it('should throw invalid token exception', async () => {
    const mEvent: DeepPartial<APIGatewayProxyEventV2> = {
      requestContext: {
            authorizer: {
            jwt: {
                claims: {
                    "token_use": "access",
                }
            }
        } 
      },
    };
    await expectError(
      mEvent as Partial<APIGatewayProxyEventV2>,
      'IdTokenRequiredException',
    );
    // No Db Call
    expect(mockConstants.sendSpy).toHaveBeenCalledTimes(0);
  });
  */
  it('should expect 3 orders returned', async () => {
    const mEvent: DeepPartial<APIGatewayProxyEventV2> = {
      requestContext: {
        /*
        authorizer: {
            jwt: {
                claims: {
                    "token_use": "id",
                    "cognito:username": "user"
                }
            }
        }
        */
      },
    };

    (mEvent.requestContext!.authorizer as unknown as LambdaRequestContext) = {
      lambda: {
        accessPayload: {
          username: 'username',
        },
      },
    };
    const item: Partial<OrderTable> = {
      user: 'username',
      orders: [
        {
          slot: 0,
          productId: 'productId',
          category: supportedCategories[0],
          count: 1,
          name: 'IPhone X',
          price: 500,
        },
      ],
      amount: 500,
      logs: constants.cartIntent,
      createdAt: 123,
    };
    mockConstants.spySend.mockImplementation(((command: QueryCommand) => {
      return Promise.resolve({
        Items: Array(3).fill(marshall(item)),
      });
    }) as any);
    mockConstants.value.queryResult = Array(3).fill(item);

    await expectTruthy(mEvent as APIGatewayProxyEventV2);
    // Getting order from Db
    expect(mockConstants.spySend).toHaveBeenCalledTimes(1);
  });
  it('should expect no orders returned', async () => {
    const mEvent: DeepPartial<APIGatewayProxyEventV2> = {
      requestContext: {
        /*
        authorizer: {
            jwt: {
                claims: {
                    "token_use": "id",
                    "cognito:username": "user"
                }
            }
        }
        */
      },
    };
    (mEvent.requestContext!.authorizer as unknown as LambdaRequestContext) = {
      lambda: {
        accessPayload: {
          username: 'username',
        },
      },
    };

    mockConstants.value.queryResult = [];
    mockConstants.spySend.mockImplementation(((command: QueryCommand) => {
      return Promise.resolve({
        Items: undefined,
      });
    }) as any);

    await expectTruthy(mEvent as APIGatewayProxyEventV2);
    // Getting order from Db
    expect(mockConstants.spySend).toHaveBeenCalledTimes(1);
  });
  it('should throw limit exception', async () => {
    const mEvent: DeepPartial<APIGatewayProxyEventV2> = {
      requestContext: {},
      queryStringParameters: {
        limit: '0',
      },
    };
    (mEvent.requestContext!.authorizer as unknown as LambdaRequestContext) = {
      lambda: {
        accessPayload: {
          username: 'username',
        },
      },
    };

    await expectError(
      mEvent as APIGatewayProxyEventV2,
      'InvalidLimitException',
    );
    // No Db Call
    expect(mockConstants.spySend).toHaveBeenCalledTimes(0);
  });
});
