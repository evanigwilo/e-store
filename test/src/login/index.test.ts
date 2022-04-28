import {APIGatewayProxyEventV2} from 'aws-lambda/trigger/api-gateway-proxy';
import {
  AdminInitiateAuthCommandInput,
  AdminInitiateAuthCommandOutput,
  CognitoIdentityProvider,
} from '@aws-sdk/client-cognito-identity-provider';
import {login} from '../../../src/login';

import {authenticationResult, cookieData, cookieValue} from '../../mockData';
import {DeepPartial, constants} from '../../../lib/utils';
// jest.mock('@aws-sdk/client-cognito-identity-provider');

describe('Login Service', () => {
  beforeEach(() => {
    // (CognitoIdentityProvider.prototype.adminInitiateAuth as jest.Mock).mockImplementation
    jest
      .spyOn(CognitoIdentityProvider.prototype, 'adminInitiateAuth')
      .mockImplementation((args: AdminInitiateAuthCommandInput) => {
        const result: Partial<AdminInitiateAuthCommandOutput> = {
          AuthenticationResult: authenticationResult,
        };
        return Promise.resolve(result);
      });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const expectError = async (
    event: APIGatewayProxyEventV2,
    errorMsg: string,
  ) => {
    const response = await login(event);
    const body = JSON.parse(response.body);
    expect(body.name).toEqual(errorMsg);
    expect(response.statusCode).toEqual(400);
  };
  const expectTruthy = async (event: APIGatewayProxyEventV2) => {
    const response = await login(event);
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

  it('should show token with valid login credentials', async () => {
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
      body: JSON.stringify({
        identity: 'one',
        password: '123456',
      }),
      cookies: cookieValue,
    };

    await expectTruthy(mEvent as APIGatewayProxyEventV2);
    mEvent.body = JSON.stringify({
      identity: 'one@two.com',
      password: '123456',
    });
    await expectTruthy(mEvent as APIGatewayProxyEventV2);
  });
  it('should show error with invalid login credentials', async () => {
    // No Name or Email
    const mEvent: Partial<APIGatewayProxyEventV2> = {
      body: JSON.stringify({
        identity: '',
        password: '123456',
      }),
      cookies: cookieValue,
    };
    await expectError(
      mEvent as APIGatewayProxyEventV2,
      'UsernameOrEmailInvalidException',
    );
    // Name or Email Less than 3
    mEvent.body = JSON.stringify({
      identity: 'ab',
      password: '123456',
    });
    await expectError(
      mEvent as APIGatewayProxyEventV2,
      'UsernameOrEmailInvalidException',
    );
    // Password Less than 6
    mEvent.body = JSON.stringify({
      identity: 'abc',
      password: '123',
    });
    await expectError(
      mEvent as APIGatewayProxyEventV2,
      'PasswordInvalidException',
    );
  });
});
