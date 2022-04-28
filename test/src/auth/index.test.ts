import {APIGatewayProxyEventV2} from 'aws-lambda/trigger/api-gateway-proxy';
import {CognitoIdentityProvider} from '@aws-sdk/client-cognito-identity-provider';
import {auth} from '../../../src/auth';
import {DeepPartial, LambdaRequestContext, constants} from '../../../lib/utils';

describe('User Authorizer Service', () => {
  beforeEach(() => {
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
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const expectTruthy = async (event: APIGatewayProxyEventV2) => {
    const response = await auth(event);
    const body = JSON.parse(response.body);
    expect(body).toStrictEqual({
      manageProducts: true,
      emailVerified: true,
      username: 'username',
      admin: true,
    });
    expect(response.statusCode).toEqual(200);
  };
  it('should return valid user attributes', async () => {
    const mEvent: DeepPartial<APIGatewayProxyEventV2> = {
      requestContext: {},
    };
    (mEvent.requestContext!.authorizer as DeepPartial<LambdaRequestContext>) = {
      lambda: {
        user: {
          UserAttributes: [
            {
              Name: 'email_verified',
              Value: 'true',
            },
          ],
          Username: 'username',
        },
      },
    };
    await expectTruthy(mEvent as APIGatewayProxyEventV2);
  });
});
