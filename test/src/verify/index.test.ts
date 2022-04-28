import {APIGatewayProxyEventV2} from 'aws-lambda/trigger/api-gateway-proxy';
import {CognitoIdentityProvider} from '@aws-sdk/client-cognito-identity-provider';
import {verify} from '../../../src/verify';

describe('Verify Service', () => {
  beforeEach(() => {
    jest
      .spyOn(
        CognitoIdentityProvider.prototype,
        'getUserAttributeVerificationCode',
      )
      .mockReturnValue();
    jest
      .spyOn(CognitoIdentityProvider.prototype, 'verifyUserAttribute')
      .mockReturnValue();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should verify code', async () => {
    // No Code
    const mEvent: Partial<APIGatewayProxyEventV2> = {
      queryStringParameters: {
        code: '',
      },
    };
    const response = await verify(mEvent as APIGatewayProxyEventV2);
    expect(response).toStrictEqual({
      body: '',
      statusCode: 204,
    });
    // With Code
    mEvent.queryStringParameters!.code = 'code';
    expect(response).toStrictEqual({
      body: '',
      statusCode: 204,
    });
  });
});
