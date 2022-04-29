import {APIGatewayProxyEventV2} from 'aws-lambda/trigger/api-gateway-proxy';
import {
  BatchGetItemCommand,
  BatchGetItemCommandOutput,
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import {marshall} from '@aws-sdk/util-dynamodb';
import {
  constants,
  DeepPartial,
  LambdaRequestContext,
  Orders,
  OrderTable,
  ProductTable,
  supportedCategories,
} from '../../../../lib/utils';
import {orderCreate} from '../../../../src/order/create';

const mockConstants = {
  sendSpy: jest.spyOn(DynamoDBClient.prototype, 'send'),
  result: {
    amount: 500,
    status: constants.cartStatus,
    intent: constants.cartIntent,
    logs: constants.orderLogs,
    orders: [
      {
        slot: 1,
        productId: '1',
        category: supportedCategories[0],
        name: 'IPhone',
        price: 100,
        count: 1,
      },
      {
        slot: 2,
        productId: '2',
        category: supportedCategories[0],
        name: 'Samsung',
        price: 200,
        count: 2,
      },
    ],
    user: 'user',
  },
  item: {} as Partial<OrderTable>,
};
const batchResult = () => {
  const items: ProductTable[] = [
    {
      category: supportedCategories[0],
      createdAt: 123,
      id: '1',
      price: 100,
      name: 'IPhone',
      image_1: true,
    },
    {
      category: supportedCategories[0],
      createdAt: 123,
      id: '2',
      price: 200,
      name: 'Samsung',
      image_2: true,
    },
  ];
  const result: Partial<BatchGetItemCommandOutput> = {
    Responses: {
      [constants.productTable]: items.map(item => marshall(item)),
    },
  };
  return Promise.resolve(result);
};

describe('Create Order Service', () => {
  afterAll(() => {
    jest.restoreAllMocks();
  });

  const expectError = async (
    event: APIGatewayProxyEventV2,
    errorMsg: string,
  ) => {
    mockConstants.sendSpy.mockClear();
    const response = await orderCreate(event);
    const body = JSON.parse(response.body);
    expect(body.name).toEqual(errorMsg);
    expect(response.statusCode).toEqual(400);
  };
  const expectTruthy = async (event: APIGatewayProxyEventV2) => {
    mockConstants.sendSpy.mockClear();
    const response = await orderCreate(event);
    const body = JSON.parse(response.body) as OrderTable;
    expect(body).toStrictEqual({
      ...mockConstants.result,
      createdAt: body.createdAt,
    });
    expect(response.statusCode).toEqual(200);
  };

  it('should throw order processing exception', async () => {
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
      body: '{}',
    };
    (mEvent.requestContext!.authorizer as unknown as LambdaRequestContext) = {
      lambda: {
        accessPayload: {
          username: 'user',
        },
      },
    };

    await expectError(
      mEvent as APIGatewayProxyEventV2,
      'InvalidOrderException',
    );
    // No Db Call
    expect(mockConstants.sendSpy).toHaveBeenCalledTimes(0);

    /*
      mEvent.body = JSON.stringify([]);

      await expectError(
        mEvent as Partial<APIGatewayProxyEventV2>,
        'NoOrderAfterProcessingException',
      ); 
    */
  });
  it('should create new cart', async () => {
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
      body: JSON.stringify([
        {
          productId: '1',
          count: 1,
        },
        {
          productId: '2',
          count: 2,
        },
      ] as Orders[]),
    };
    (mEvent.requestContext!.authorizer as unknown as LambdaRequestContext) = {
      lambda: {
        accessPayload: {
          username: 'user',
        },
      },
    };

    mockConstants.sendSpy.mockImplementation(((
      command: GetItemCommand | PutItemCommand | BatchGetItemCommand,
    ) => {
      if ('RequestItems' in command.input) {
        // BatchGetItemCommand
        return batchResult();
      }
      if ('Item' in command.input) {
        // PutItemCommand;
        return Promise.resolve();
      }
      // GetItemCommand
      return Promise.resolve({
        Item: undefined,
      });
    }) as any);

    await expectTruthy(mEvent as APIGatewayProxyEventV2);
    // Batching getting product from Db, Checks existing cart in Db, creating cart
    expect(mockConstants.sendSpy).toHaveBeenCalledTimes(3);
  });
  it('should update existing cart', async () => {
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
      body: JSON.stringify([
        {
          productId: '1',
          count: 1,
        },
        {
          productId: '2',
          count: 2,
        },
      ] as Orders[]),
    };
    (mEvent.requestContext!.authorizer as unknown as LambdaRequestContext) = {
      lambda: {
        accessPayload: {
          username: 'user',
        },
      },
    };

    mockConstants.sendSpy.mockImplementation(((
      command: GetItemCommand | UpdateItemCommand | BatchGetItemCommand,
    ) => {
      if ('UpdateExpression' in command.input) {
        // UpdateItemCommand
        return Promise.resolve(mockConstants.result);
      }
      if ('RequestItems' in command.input) {
        // BatchGetItemCommand
        return batchResult();
      }
      // GetItemCommand
      return Promise.resolve({
        Item: {},
      });
    }) as any);

    await expectTruthy(mEvent as APIGatewayProxyEventV2);
    // Batching getting product from Db, Checks existing cart in Db, updating cart
    expect(mockConstants.sendSpy).toHaveBeenCalledTimes(3);
  });
});
