import {APIGatewayProxyEventV2} from 'aws-lambda/trigger/api-gateway-proxy';
import {CognitoIdentityProvider} from '@aws-sdk/client-cognito-identity-provider';
import {cookieValue, cookieDataEmpty} from '../../mockData';
import {logout} from '../../../src/logout';

describe('Logout Service', () => {
  beforeEach(() => {
    jest
      .spyOn(CognitoIdentityProvider.prototype, 'revokeToken')
      .mockImplementation(() => Promise.resolve());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const expectTruthy = async (event: APIGatewayProxyEventV2) => {
    const response = await logout(event);
    expect(response).toStrictEqual({
      body: '',
      statusCode: 204,
      cookies: cookieDataEmpty,
    });
  };
  it('should return status 204 with cookies', async () => {
    const mEvent: Partial<APIGatewayProxyEventV2> = {
      cookies: cookieValue,
    };
    await expectTruthy(mEvent as APIGatewayProxyEventV2);
  });
});
