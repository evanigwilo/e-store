import {APIGatewayProxyEventV2} from 'aws-lambda/trigger/api-gateway-proxy';
import Stripe from 'stripe';
import {DynamoDBClient, GetItemCommand} from '@aws-sdk/client-dynamodb';
import {marshall} from '@aws-sdk/util-dynamodb';
import {
  constants,
  DeepPartial,
  LambdaRequestContext,
  OrderTable,
} from '../../../../lib/utils';
import {paymentCheckout} from '../../../../src/payment/checkout';

const mockConstants = {
  sendSpy: jest.spyOn(DynamoDBClient.prototype, 'send'),
  result: {client_secret: 'clientSecret', amount: 500},
  item: {
    user: 'one',
    orders: [
      {
        slot: 0,
        productId: 'productId',
        category: 'Mobile Phone',
        count: 1,
        name: 'IPhone X',
        price: 500,
      },
    ],
    amount: 500,
    logs: constants.cartIntent,
    createdAt: 123,
  } as Partial<OrderTable>,
};

jest.mock('../../../../lib/utils', () => ({
  ...jest.requireActual('../../../../lib/utils'),
  loadConfig: jest.fn().mockImplementation(() =>
    Promise.resolve({
      stripe_api_secret_key: 'stripe_api_secret_key',
    }),
  ),
}));

jest.mock('stripe', () => ({
  __esModule: true,
  default: jest
    .fn()
    .mockImplementation((apiKey: string, config: Stripe.StripeConfig) => {
      return {
        paymentIntents: {
          create: () => mockConstants.result,
        },
      };
    }),
}));

describe('PaymentCheckout Service', () => {
  beforeEach(() => {
    /*
      jest.spyOn(loadConfig., "loadConfig").mockImplementation(() =>
        Promise.resolve({
          stripe_api_secret_key: 'stripe_api_secret_key',
        }),
      );
    */
  });
  afterAll(() => {
    jest.restoreAllMocks();
  });

  const expectError = async (
    event: APIGatewayProxyEventV2,
    errorMsg: string,
  ) => {
    mockConstants.sendSpy.mockClear();
    const response = await paymentCheckout(event);
    const body = JSON.parse(response.body);
    expect(body.name).toEqual(errorMsg);
    expect(response.statusCode).toEqual(400);
  };
  const expectTruthy = async (event: APIGatewayProxyEventV2) => {
    mockConstants.sendSpy.mockClear();
    const response = await paymentCheckout(event);

    const body = JSON.parse(response.body);
    expect(body.clientSecret).toEqual(mockConstants.result.client_secret);
    expect(body.amount).toEqual(mockConstants.result.amount);
    expect(response.statusCode).toEqual(200);
  };

  it('should throw exceptions', async () => {
    const mEvent: DeepPartial<APIGatewayProxyEventV2> = {
      requestContext: {},
    };
    (mEvent.requestContext!.authorizer as unknown as LambdaRequestContext) = {
      lambda: {
        accessPayload: {
          username: 'username',
        },
      },
    };

    mockConstants.sendSpy.mockImplementation(((command: GetItemCommand) => {
      return Promise.resolve({
        Item: undefined,
      });
    }) as any);

    await expectError(
      mEvent as APIGatewayProxyEventV2,
      'NoOrderInCartException',
    );
    // Getting order from Db
    expect(mockConstants.sendSpy).toHaveBeenCalledTimes(1);

    mockConstants.sendSpy.mockImplementation(((command: GetItemCommand) => {
      return Promise.resolve({
        Item: marshall({orders: []}),
      });
    }) as any);

    await expectError(mEvent as APIGatewayProxyEventV2, 'NoOrderException');
    // Getting order from Db
    expect(mockConstants.sendSpy).toHaveBeenCalledTimes(1);

    mockConstants.sendSpy.mockImplementation(((command: GetItemCommand) => {
      // GetItemCommand
      return Promise.resolve({
        Item: marshall(mockConstants.item),
      });
    }) as any);
    mEvent.body = JSON.stringify({
      location: {},
    } as Partial<OrderTable>);
    await expectError(
      mEvent as APIGatewayProxyEventV2,
      'InvalidLocationException',
    );
    // Getting order from Db
    expect(mockConstants.sendSpy).toHaveBeenCalledTimes(1);
  });
  it('should expect client secret', async () => {
    const mEvent: DeepPartial<APIGatewayProxyEventV2> = {
      requestContext: {},
      body: JSON.stringify({
        location: {
          address: 'address',
          country: 'country',
        },
      } as Partial<OrderTable>),
    };
    (mEvent.requestContext!.authorizer as unknown as LambdaRequestContext) = {
      lambda: {
        accessPayload: {
          username: 'username',
        },
      },
    };

    mockConstants.sendSpy.mockImplementation(((command: GetItemCommand) => {
      // GetItemCommand
      return Promise.resolve({
        Item: marshall(mockConstants.item),
      });
    }) as any);

    await expectTruthy(mEvent as APIGatewayProxyEventV2);
    // Getting order from Db and updating location
    expect(mockConstants.sendSpy).toHaveBeenCalledTimes(2);
  });
});
