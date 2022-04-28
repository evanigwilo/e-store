import {APIGatewayProxyEventV2} from 'aws-lambda/trigger/api-gateway-proxy';
import {
  CognitoIdentityProvider,
  ListUsersCommandOutput,
  ListUsersInGroupCommandOutput,
} from '@aws-sdk/client-cognito-identity-provider';
import {users} from '../../../src/users';
import {constants} from '../../../lib/utils';

describe('Users Service', () => {
  beforeEach(() => {
    jest
      .spyOn(CognitoIdentityProvider.prototype, 'listUsersInGroup')
      .mockResolvedValue(
        Promise.resolve({
          Users: [
            {
              Attributes: [
                {
                  Name: 'gender',
                  Value: 'male',
                },
              ],
              Enabled: true,
              Username: '3',
              UserStatus: 'CONFIRMED',
            },
          ],
        } as Partial<ListUsersInGroupCommandOutput>) as never,
      );
    jest
      .spyOn(CognitoIdentityProvider.prototype, 'listUsers')
      .mockResolvedValue(
        Promise.resolve({
          Users: [
            {
              Attributes: [
                {
                  Name: 'gender',
                  Value: 'male',
                },
              ],
              Enabled: true,
              Username: '1',
              UserStatus: 'CONFIRMED',
            },
            {
              Attributes: [
                {
                  Name: 'gender',
                  Value: 'male',
                },
              ],
              Enabled: true,
              Username: '2',
              UserStatus: 'CONFIRMED',
            },
            {
              Attributes: [
                {
                  Name: 'gender',
                  Value: 'male',
                },
              ],
              Enabled: true,
              Username: '3',
              UserStatus: 'CONFIRMED',
            },
          ],
        } as Partial<ListUsersCommandOutput>) as never,
      );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return users', async () => {
    const response = await users({} as APIGatewayProxyEventV2);
    const value = JSON.parse(response.body);
    expect(value).toStrictEqual([
      {username: '1', group: '', status: 'CONFIRMED', gender: 'male'},
      {username: '2', group: '', status: 'CONFIRMED', gender: 'male'},
      {
        username: '3',
        group: constants.groups.admin,
        status: 'CONFIRMED',
        gender: 'male',
      },
    ]);
    expect(response.statusCode).toEqual(200);
  });
});
