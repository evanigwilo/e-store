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
import {orderIntent} from '../../../../src/order/intent';

const mockConstants = {
  sendSpy: jest.spyOn(DynamoDBClient.prototype, 'send'),
  result: {} as Partial<OrderTable>,
  dateNowSpy: jest.spyOn(Date, 'now').mockImplementation(() => 123),
};

const batchResult = () => {
  const items: ProductTable[] = [
    {
      category: supportedCategories[0],
      createdAt: 123,
      id: '1',
      price: 500,
      name: 'IPhone',
      image_1: true,
    },
    {
      category: supportedCategories[0],
      createdAt: 123,
      id: '2',
      price: 1000,
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

describe('Order Intent Service', () => {
  afterAll(() => {
    jest.restoreAllMocks();
  });

  const expectError = async (
    event: APIGatewayProxyEventV2,
    errorMsg: string,
  ) => {
    mockConstants.sendSpy.mockClear();
    const response = await orderIntent(event);
    const body = JSON.parse(response.body);
    expect(body.name).toEqual(errorMsg);
    expect(response.statusCode).toEqual(400);
  };
  const expectTruthy = async (event: APIGatewayProxyEventV2) => {
    mockConstants.sendSpy.mockClear();
    const response = await orderIntent(event);
    const body = JSON.parse(response.body);
    expect(body).toStrictEqual(mockConstants.result);
    expect(response.statusCode).toEqual(200);
  };
  it('should throw no intent specified exception', async () => {
    const mEvent: DeepPartial<APIGatewayProxyEventV2> = {
      requestContext: {},
      pathParameters: {
        intent: '',
      },
    };
    (mEvent.requestContext!.authorizer as unknown as LambdaRequestContext) = {
      lambda: {
        accessPayload: {
          username: 'username',
        },
      },
    };

    await expectError(mEvent as APIGatewayProxyEventV2, 'No Intent Specified');
    // No Db Call
    expect(mockConstants.sendSpy).toHaveBeenCalledTimes(0);
  });
  it('should create cart using local cart', async () => {
    const mEvent: DeepPartial<APIGatewayProxyEventV2> = {
      requestContext: {},
      pathParameters: {
        intent: constants.cartIntent,
      },
      body: JSON.stringify([
        {
          productId: '1',
          count: 1,
        },
        {
          productId: '2',
          count: 4,
        },
        {
          productId: '3',
          count: 3,
        },
      ] as Orders[]),
    };
    (mEvent.requestContext!.authorizer as unknown as LambdaRequestContext) = {
      lambda: {
        accessPayload: {
          username: 'username',
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
      if ('AttributesToGet' in command.input) {
        // GetItemCommand
        return Promise.resolve({Item: undefined});
      }
      // PutItemCommand
      return Promise.resolve();
    }) as any);
    mockConstants.result = {
      status: constants.cartStatus,
      user: 'username',
      intent: constants.cartIntent,
      orders: [
        {
          slot: 1,
          productId: '1',
          category: supportedCategories[0],
          count: 1,
          name: 'IPhone',
          price: 500,
        },
        {
          slot: 2,
          productId: '2',
          category: supportedCategories[0],
          count: 4,
          name: 'Samsung',
          price: 1000,
        },
      ],
      amount: 4500,
      logs: constants.orderLogs,
      createdAt: 123,
    };

    await expectTruthy(mEvent as APIGatewayProxyEventV2);
    // Getting order from Db, get product ids and updating cart
    expect(mockConstants.sendSpy).toHaveBeenCalledTimes(3);
  });
  it('should update cart using local cart', async () => {
    const mEvent: DeepPartial<APIGatewayProxyEventV2> = {
      requestContext: {},
      pathParameters: {
        intent: constants.cartIntent,
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
          username: 'username',
        },
      },
    };

    mockConstants.sendSpy.mockImplementation(((
      command: GetItemCommand | UpdateItemCommand | BatchGetItemCommand,
    ) => {
      if ('RequestItems' in command.input) {
        // BatchGetItemCommand
        return batchResult();
      }
      if ('UpdateExpression' in command.input) {
        // UpdateItemCommand
        return Promise.resolve();
      }
      // GetItemCommand
      return Promise.resolve({
        Item: marshall({
          status: constants.cartStatus,
          orders: [
            {
              slot: 0,
              productId: '2',
              category: supportedCategories[0],
              count: 1,
              name: 'S6',
              price: 500,
            },
            {
              slot: 0,
              productId: '3',
              category: supportedCategories[0],
              count: 15,
              name: 'Bed',
              price: 800,
            },
          ],
          amount: 500,
          logs: constants.orderLogs,
          createdAt: 123,
        } as Partial<OrderTable>),
      });
    }) as any);
    mockConstants.result = {
      status: constants.cartStatus,
      user: 'username',
      intent: constants.cartIntent,
      orders: [
        {
          slot: 2,
          productId: '2',
          category: supportedCategories[0],
          count: 2,
          name: 'Samsung',
          price: 1000,
        },
        {
          slot: 1,
          productId: '1',
          category: supportedCategories[0],
          count: 1,
          name: 'IPhone',
          price: 500,
        },
      ],
      amount: 2500,
      logs: constants.orderLogs,
      createdAt: 123,
    };
    await expectTruthy(mEvent as APIGatewayProxyEventV2);
    // Getting order from Db, get product ids and updating cart
    expect(mockConstants.sendSpy).toHaveBeenCalledTimes(3);
  });
  it('should return order', async () => {
    const mEvent: DeepPartial<APIGatewayProxyEventV2> = {
      requestContext: {},
      pathParameters: {
        intent: 'intent',
      },
    };
    (mEvent.requestContext!.authorizer as unknown as LambdaRequestContext) = {
      lambda: {
        accessPayload: {
          username: 'username',
        },
      },
    };

    mockConstants.sendSpy.mockImplementation(((
      command: GetItemCommand, // GetItemCommand
    ) => Promise.resolve({Item: undefined})) as any);

    mockConstants.result = {orders: []};

    await expectTruthy(mEvent as APIGatewayProxyEventV2);
    // Getting order from Db
    expect(mockConstants.sendSpy).toHaveBeenCalledTimes(1);
  });
});
