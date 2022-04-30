import {APIGatewayProxyEventV2} from 'aws-lambda/trigger/api-gateway-proxy';
import {DynamoDBClient, QueryCommand} from '@aws-sdk/client-dynamodb';
import {marshall} from '@aws-sdk/util-dynamodb';
import {DeepPartial, supportedCategories} from '../../../lib/utils';
import {products} from '../../../src/products';

const mockConstants = {
  sendSpy: jest.spyOn(DynamoDBClient.prototype, 'send'),
  result: [
    {
      category: supportedCategories[0],
      createdAt: 123,
      id: '1',
      price: 100,
      name: 'IPhone',
    },
  ],
};

describe('Products Service', () => {
  afterAll(() => {
    jest.restoreAllMocks();
  });

  const expectError = async (
    event: APIGatewayProxyEventV2,
    errorMsg: string,
  ) => {
    mockConstants.sendSpy.mockClear();
    const response = await products(event);
    const body = JSON.parse(response.body);
    expect(body.name).toEqual(errorMsg);
    expect(response.statusCode).toEqual(400);
  };
  const expectTruthy = async (event: APIGatewayProxyEventV2) => {
    mockConstants.sendSpy.mockClear();
    const response = await products(event);
    const body = JSON.parse(response.body);
    // const stateName = expect.getState().currentTestName;
    expect(body.queryResult).toStrictEqual(mockConstants.result);
    expect(response.statusCode).toEqual(200);
  };

  it('should get products by category', async () => {
    const mEvent: DeepPartial<APIGatewayProxyEventV2> = {
      queryStringParameters: {
        category: supportedCategories[0],
      },
    };
    mockConstants.sendSpy.mockImplementation(((command: QueryCommand) => {
      return Promise.resolve({
        Items: [marshall(mockConstants.result[0])],
      });
    }) as any);

    await expectTruthy(mEvent as APIGatewayProxyEventV2);
    // Getting order from Db
    expect(mockConstants.sendSpy).toHaveBeenCalledTimes(1);
  });
  it('should get all products', async () => {
    const mEvent: DeepPartial<APIGatewayProxyEventV2> = {
      queryStringParameters: {
        category: '',
      },
    };
    mockConstants.sendSpy.mockImplementation(((command: QueryCommand) => {
      return Promise.resolve({
        Items: [marshall(mockConstants.result[0])],
      });
    }) as any);

    await expectTruthy(mEvent as APIGatewayProxyEventV2);
    // Getting order from Db
    expect(mockConstants.sendSpy).toHaveBeenCalledTimes(1);
  });
  it('should throw limit exception', async () => {
    const mEvent: DeepPartial<APIGatewayProxyEventV2> = {
      body: JSON.stringify({
        name: '',
      }),
      queryStringParameters: {
        limit: '0',
      },
    };

    await expectError(
      mEvent as APIGatewayProxyEventV2,
      'InvalidLimitException',
    );

    // No Db Call
    expect(mockConstants.sendSpy).toHaveBeenCalledTimes(0);
  });
});
