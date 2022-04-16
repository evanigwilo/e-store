/* eslint-disable @typescript-eslint/require-await */
import {CognitoIdentityProvider} from '@aws-sdk/client-cognito-identity-provider';
import {APIGatewayProxyEventV2, APIGatewayProxyResult} from 'aws-lambda';

import {
  lambdaResponse,
  LambdaRequestContext,
  userProperties,
} from '../../lib/utils';

export async function auth(
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResult> {
  try {
    const {
      lambda: {user},
    } = event.requestContext.authorizer as unknown as LambdaRequestContext;

    // 👇 return user properties
    const provider = new CognitoIdentityProvider({region: process.env.region});
    const {Groups} = await provider.adminListGroupsForUser({
      UserPoolId: process.env.userPoolId,
      Username: user?.Username,
    });

    return lambdaResponse(userProperties(Groups, user), 200);
  } catch (error) {
    return lambdaResponse(error, 500);
  }
}
