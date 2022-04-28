import {APIGatewayProxyEventV2} from 'aws-lambda/trigger/api-gateway-proxy';
import {CognitoIdentityProvider} from '@aws-sdk/client-cognito-identity-provider';
import {refresh} from '../../../src/refresh';
import {authenticationResult, cookieData, cookieValue} from '../../mockData';
import {constants, DeepPartial} from '../../../lib/utils';

describe('Refresh Service', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  const expectError = async (
    event: APIGatewayProxyEventV2,
    errorMsg: string,
  ) => {
    const response = await refresh(event);
    const body = JSON.parse(response.body);
    expect(body.name).toEqual(errorMsg);
    expect(response.statusCode).toEqual(400);
  };
  const expectTruthy = async (event: APIGatewayProxyEventV2) => {
    const response = await refresh(event);
    const body = JSON.parse(response.body);
    expect(body).toStrictEqual({
      manageProducts: true,
      emailVerified: true,
      username: 'username',
      admin: true,
      tokens: authenticationResult,
    });
    expect(response.cookies).toStrictEqual(cookieData);
    expect(response.statusCode).toEqual(200);
  };

  it('should expect token when refreshed', async () => {
    jest
      .spyOn(CognitoIdentityProvider.prototype, 'adminInitiateAuth')
      .mockImplementation(() => {
        return Promise.resolve({
          AuthenticationResult: authenticationResult,
        });
      });
    jest
      .spyOn(CognitoIdentityProvider.prototype, 'getUser')
      .mockImplementation(() => {
        return Promise.resolve({
          Username: 'username',
          UserAttributes: [
            {
              Name: 'email_verified',
              Value: 'true',
            },
          ],
        });
      });
    jest
      .spyOn(CognitoIdentityProvider.prototype, 'adminListGroupsForUser')
      .mockImplementation(() => {
        return Promise.resolve({
          Groups: [
            {
              GroupName: constants.groups.admin,
            },
            {
              GroupName: constants.groups.product,
            },
          ],
        });
      });

    const mEvent: DeepPartial<APIGatewayProxyEventV2> = {
      cookies: cookieValue,
    };
    await expectTruthy(mEvent as APIGatewayProxyEventV2);
  });
  it('should throw error with invalid refresh token exception', async () => {
    const mEvent: Partial<APIGatewayProxyEventV2> = {
      cookies: ['RefreshToken='],
    };
    await expectError(
      mEvent as APIGatewayProxyEventV2,
      'InvalidRefreshTokenException',
    );
  });
});
