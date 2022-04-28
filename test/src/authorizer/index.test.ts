import {APIGatewayProxyEventV2} from 'aws-lambda/trigger/api-gateway-proxy';
import {CognitoIdentityProvider} from '@aws-sdk/client-cognito-identity-provider';
// import {CognitoJwtVerifier} from 'aws-jwt-verify';

import {authorizer} from '../../../src/authorizer';
import {cookieValue} from '../../mockData';

const jwtPayload = {
  sub: 'sub',
  exp: 'exp',
  origin_jti: 'origin_jti',
};

const spyGetUser = jest.spyOn(CognitoIdentityProvider.prototype, 'getUser');

jest.mock('aws-jwt-verify', () => ({
  __esModule: true,
  CognitoJwtVerifier: {
    create: () => ({
      verify: () => Promise.resolve(jwtPayload),
    }),
  },
  default: jest.fn().mockImplementation(() => {
    return {};
  }),
}));

describe('Lambda Authorizer Service', () => {
  beforeEach(() => {
    /*
      jest
        .spyOn(CognitoJwtVerifier.prototype, 'verify')
        .mockReturnValue(Promise.resolve(payload) as any);
      jest.spyOn(CognitoJwtVerifier, 'create').mockReturnValue(
        Promise.resolve({
          verify: () => Promise.resolve(payload),
        }) as any,
      );
    */
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  const expectError = async (event: APIGatewayProxyEventV2) => {
    const response = await authorizer(event);
    expect(response).toStrictEqual({
      isAuthorized: false,
    });
  };
  const expectTruthy = async (event: APIGatewayProxyEventV2) => {
    const response = await authorizer(event);
    expect(response).toStrictEqual({
      isAuthorized: true,
      context: {
        accessPayload: jwtPayload,
        idPayload: jwtPayload,
        user: {
          username: 'username',
        },
      },
    });
  };

  it('should expect authorized to be true', async () => {
    spyGetUser.mockImplementation(() => {
      return Promise.resolve({
        username: 'username',
      });
    });
    const mEvent: Partial<APIGatewayProxyEventV2> = {
      cookies: cookieValue,
    };
    await expectTruthy(mEvent as APIGatewayProxyEventV2);
  });
  it('should expect authorized to be false', async () => {
    spyGetUser.mockImplementation(() => Promise.reject());
    const mEvent: Partial<APIGatewayProxyEventV2> = {
      cookies: cookieValue,
    };
    await expectError(mEvent as APIGatewayProxyEventV2);
  });
});
