/* eslint-disable @typescript-eslint/require-await */
import {CognitoIdentityProvider} from '@aws-sdk/client-cognito-identity-provider';
import {APIGatewayProxyEventV2, APIGatewayProxyResult} from 'aws-lambda';

import {lambdaResponse, KeyValue, constants} from '../../lib/utils';

export async function users(
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResult> {
  try {
    const provider = new CognitoIdentityProvider({
      region: process.env.region,
    });

    // 👇 get all users
    const allUsers = await provider.listUsers({
      UserPoolId: process.env.userPoolId,
      AttributesToGet: ['gender'],
    });
    // 👇 get users in admin group
    const adminGroup = await provider.listUsersInGroup({
      UserPoolId: process.env.userPoolId,
      GroupName: constants.groups.admin,
    });
    // 👇 get users in manage products group
    const manageProductGroup = await provider.listUsersInGroup({
      UserPoolId: process.env.userPoolId,
      GroupName: constants.groups.product,
    });

    // 👇 map users to groups
    const userToGroups: KeyValue = {};
    manageProductGroup.Users?.forEach(user => {
      userToGroups[user.Username!] = constants.groups.product;
    });
    adminGroup.Users?.forEach(user => {
      userToGroups[user.Username!] = constants.groups.admin;
    });

    // 👇 normalize users and groups
    const result: KeyValue[] = [];
    allUsers.Users?.forEach(user => {
      const username = user.Username!;
      result.push({
        username,
        group: userToGroups[username] || '',
        status: user.UserStatus!,
        gender: user.Attributes![0].Value!,
      });
    });

    return lambdaResponse(result, 200);
  } catch (error) {
    return lambdaResponse(error, 500);
  }
}
