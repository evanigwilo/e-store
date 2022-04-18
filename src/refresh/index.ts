/* eslint-disable @typescript-eslint/require-await */
import {
  AdminInitiateAuthCommandInput,
  CognitoIdentityProvider,
} from '@aws-sdk/client-cognito-identity-provider';
import {APIGatewayProxyEventV2, APIGatewayProxyResult} from 'aws-lambda';

import {
  lambdaResponse,
  tokensToCookies,
  getCookieValue,
  userProperties,
} from '../../lib/utils';

export async function refresh(
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResult & {cookies?: string[]}> {
  try {
    // 👇 check refresh token exists
    const refreshToken = getCookieValue(event, 'RefreshToken');
    if (!refreshToken)
      return lambdaResponse({name: 'InvalidRefreshTokenException'}, 400);

    const params: AdminInitiateAuthCommandInput = {
      UserPoolId: process.env.userPoolId,
      ClientId: process.env.userPoolClientId,
      AuthFlow: 'REFRESH_TOKEN_AUTH',
      AuthParameters: {
        REFRESH_TOKEN: refreshToken,
      },
    };
    const provider = new CognitoIdentityProvider({
      region: process.env.region,
    });
    const {AuthenticationResult: tokens} = await provider.adminInitiateAuth(
      params,
    );

    // 👇 convert token to cookies
    const cookies = tokensToCookies(tokens);
    // 👇 get user properties
    const user = await provider.getUser({
      AccessToken: tokens!.AccessToken,
    });
    const {Groups} = await provider.adminListGroupsForUser({
      UserPoolId: process.env.userPoolId,
      Username: user.Username,
    });

    return {
      ...lambdaResponse(
        {
          ...userProperties(Groups, user),
          tokens,
        },
        200,
      ),
      cookies,
    };
  } catch (error) {
    return lambdaResponse(error, 500);
  }
}
