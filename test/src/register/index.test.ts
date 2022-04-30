import {APIGatewayProxyEventV2} from 'aws-lambda/trigger/api-gateway-proxy';
import {
  AdminInitiateAuthCommandInput,
  AdminInitiateAuthCommandOutput,
  CognitoIdentityProvider,
} from '@aws-sdk/client-cognito-identity-provider';
import {register} from '../../../src/register';
import {authenticationResult, cookieData} from '../../mockData';
import {DeepPartial} from '../../../lib/utils';

describe('Register Service', () => {
  beforeEach(() => {
    jest
      .spyOn(CognitoIdentityProvider.prototype, 'adminInitiateAuth')
      .mockImplementation((args: AdminInitiateAuthCommandInput) => {
        const result: Partial<AdminInitiateAuthCommandOutput> = {
          AuthenticationResult: authenticationResult,
        };
        return Promise.resolve(result);
      });
    jest
      .spyOn(CognitoIdentityProvider.prototype, 'adminInitiateAuth')
      .mockImplementation(() => {
        return Promise.resolve({
          AuthenticationResult: authenticationResult,
        });
      });
    jest.spyOn(CognitoIdentityProvider.prototype, 'signUp').mockReturnValue();
    jest
      .spyOn(CognitoIdentityProvider.prototype, 'adminConfirmSignUp')
      .mockReturnValue();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const expectError = async (
    event: APIGatewayProxyEventV2,
    errorMsg: string,
  ) => {
    const response = await register(event);
    const body = JSON.parse(response.body);
    expect(body.name).toEqual(errorMsg);
    expect(response.statusCode).toEqual(400);
  };
  const expectTruthy = async (event: APIGatewayProxyEventV2) => {
    const response = await register(event);
    const body = JSON.parse(response.body);
    expect(body).toStrictEqual({
      manageProducts: false,
      emailVerified: false,
      username: 'username',
      admin: false,
      tokens: authenticationResult,
    });
    expect(response.cookies).toStrictEqual(cookieData);
    expect(response.statusCode).toEqual(200);
  };

  it('should expect token with valid register credentials', async () => {
    jest
      .spyOn(CognitoIdentityProvider.prototype, 'listUsers')
      .mockImplementation(() => {
        return {Users: []};
      });
    jest
      .spyOn(CognitoIdentityProvider.prototype, 'adminListGroupsForUser')
      .mockImplementation(() => {
        return Promise.resolve({
          Groups: [],
        });
      });

    // Male Gender
    const mEvent: DeepPartial<APIGatewayProxyEventV2> = {
      body: JSON.stringify({
        email: 'username@username.com',
        username: 'username',
        password: '123456',
        gender: 'male',
      }),
    };

    await expectTruthy(mEvent as APIGatewayProxyEventV2);
    // Female Gender
    mEvent.body = JSON.stringify({
      email: 'username@username.com',
      username: 'username',
      password: '123456',
      gender: 'female',
    });
    await expectTruthy(mEvent as APIGatewayProxyEventV2);
  });
  it('should throw error with invalid register credentials', async () => {
    // Username Invalid Exception
    let mEvent: Partial<APIGatewayProxyEventV2> = {
      body: JSON.stringify({
        username: '',
      }),
    };
    await expectError(
      mEvent as APIGatewayProxyEventV2,
      'UsernameInvalidException',
    );
    // Username Is Email Exception
    mEvent = {
      body: JSON.stringify({
        username: 'one@two.com',
      }),
    };
    await expectError(
      mEvent as APIGatewayProxyEventV2,
      'UsernameIsEmailException',
    );
    // Email Invalid Exception
    mEvent = {
      body: JSON.stringify({
        username: 'one',
        email: 'one@two',
      }),
    };
    await expectError(
      mEvent as APIGatewayProxyEventV2,
      'EmailInvalidException',
    );
    // Gender Invalid Exception
    mEvent = {
      body: JSON.stringify({
        username: 'one',
        email: 'one@two.com',
        gender: 'boy',
      }),
    };
    await expectError(
      mEvent as APIGatewayProxyEventV2,
      'GenderInvalidException',
    );
  });
  it('should throw error with existing email register', async () => {
    jest
      .spyOn(CognitoIdentityProvider.prototype, 'listUsers')
      .mockImplementation(() => {
        return {Users: ['Dummy Object']};
      });
    // Email Exists Exception
    const mEvent: Partial<APIGatewayProxyEventV2> = {
      body: JSON.stringify({
        email: 'one@two.com',
        username: 'one',
        password: '123456',
        gender: 'male',
      }),
    };
    await expectError(mEvent as APIGatewayProxyEventV2, 'EmailExistsException');
  });
});
