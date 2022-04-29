import {APIGatewayProxyEventV2} from 'aws-lambda/trigger/api-gateway-proxy';
import Stripe from 'stripe';
import {
  DynamoDBClient,
  GetItemCommand,
  TransactWriteItemsCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import {marshall} from '@aws-sdk/util-dynamodb';
import {paymentHook} from '../../../../src/payment/hook';
import {constants, OrderTable} from '../../../../lib/utils';

/*
  const payload = (payload: string | Buffer, header: string | string[] | Buffer, secret: string, tolerance?: number | undefined, cryptoProvider?: Stripe.CryptoProvider | undefined) => ev as Stripe.Event;
*/

const mockConstants = {
  type: '',
  sendSpy: jest.spyOn(DynamoDBClient.prototype, 'send').mockImplementation(((
    command: GetItemCommand | UpdateItemCommand | TransactWriteItemsCommand,
  ) => {
    if ('UpdateExpression' in command.input) {
      // UpdateItemCommand
      return Promise.resolve(mockConstants.result);
    }
    if ('TransactItems' in command.input) {
      // TransactWriteItemsCommand
      return Promise.resolve(mockConstants.result);
    }
    // GetItemCommand
    const item: Partial<OrderTable> = {
      user: 'username',
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
    };
    return Promise.resolve({
      Item: marshall(item),
    });
  }) as any),
  result: {
    $metadata: {
      httpStatusCode: '200',
      requestId: 'requestId',
      attempts: '1',
      totalRetryDelay: '0',
    },
  },
};

jest.mock('stripe', () => ({
  __esModule: true,
  default: jest
    .fn()
    .mockImplementation((apiKey: string, config: Stripe.StripeConfig) => {
      const ev: Partial<Stripe.Event> = {
        data: {
          object: {
            id: 'pi_3L',
            metadata: {
              user: 'username',
            },
            charges: {
              data: [
                {
                  outcome: {
                    seller_message: 'Payment complete.',
                  },
                },
              ],
            },
          },
        },
        type: mockConstants.type,
      };
      //
      return {
        webhooks: {
          constructEvent: () => ev,
        },
      };
    }),
}));
jest.mock('../../../../lib/utils', () => ({
  ...jest.requireActual('../../../../lib/utils'),
  loadConfig: jest.fn().mockImplementation(() =>
    Promise.resolve({
      stripe_api_secret_key: 'stripe_api_secret_key',
    }),
  ),
}));

describe('PaymentHook Service', () => {
  afterAll(() => {
    jest.restoreAllMocks();
  });

  const expectError = async (
    event: APIGatewayProxyEventV2,
    errorMsg: string,
  ) => {
    const response = await paymentHook(event);
    const body = JSON.parse(response.body);
    expect(body.name).toEqual(errorMsg);
    expect(response.statusCode).toEqual(400);
  };
  const expectTruthy = async (event: APIGatewayProxyEventV2) => {
    mockConstants.sendSpy.mockClear();
    const response = await paymentHook(event);
    const body = JSON.parse(response.body);
    expect(body).toStrictEqual(mockConstants.result);
    expect(response.statusCode).toEqual(200);
  };

  it('should throw no stripe signature in header error', async () => {
    const mEvent: Partial<APIGatewayProxyEventV2> = {
      headers: {},
    };
    await expectError(
      mEvent as APIGatewayProxyEventV2,
      'no Stripe signature received in header, returning 400 Bad Request',
    );
  });

  it('should throw no event body error', async () => {
    const mEvent: Partial<APIGatewayProxyEventV2> = {
      headers: {
        'stripe-signature': 'stripe-signature',
      },
    };
    await expectError(
      mEvent as APIGatewayProxyEventV2,
      'no event body received in POST, returning 400 Bad Request',
    );
  });

  it('checks all event functionality', async () => {
    const mEvent: Partial<APIGatewayProxyEventV2> = {
      headers: {
        'stripe-signature': 'stripe-signature',
      },
      body: JSON.stringify({
        id: 'id',
      }),
    };

    mockConstants.type = 'payment_intent.created';
    await expectTruthy(mEvent as APIGatewayProxyEventV2);
    // Getting order from Db and Updating it with [Payment Created]
    expect(mockConstants.sendSpy).toHaveBeenCalledTimes(2);

    mockConstants.type = 'payment_intent.succeeded';
    await expectTruthy(mEvent as APIGatewayProxyEventV2);
    // Updating Db with [Payment Succeeded]
    expect(mockConstants.sendSpy).toHaveBeenCalledTimes(1);

    mockConstants.type = 'payment_intent.payment_failed';
    await expectTruthy(mEvent as APIGatewayProxyEventV2);
    // Updating Db with [Payment Failed]
    expect(mockConstants.sendSpy).toHaveBeenCalledTimes(1);

    mockConstants.type = 'payment_intent.canceled';
    await expectTruthy(mEvent as APIGatewayProxyEventV2);
    // Updating Db with [Payment Canceled]
    expect(mockConstants.sendSpy).toHaveBeenCalledTimes(1);
  });
});
