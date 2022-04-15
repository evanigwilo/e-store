/* eslint-disable @typescript-eslint/require-await */
import {APIGatewayProxyEventV2, APIGatewayProxyResult} from 'aws-lambda';
import {
  AdminInitiateAuthCommandInput,
  CognitoIdentityProvider,
} from '@aws-sdk/client-cognito-identity-provider';
import {lambdaResponse, tokensToCookies, userProperties} from '../../lib/utils';

export async function login(
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResult & {cookies?: string[]}> {
  try {
    const body = JSON.parse(event.body || '{}');
    const identity = body?.identity;
    const password = body?.password;

    // 👇 check username/email or password validity
    if (!identity || identity.length < 3 || identity.includes(' ')) {
      return lambdaResponse({name: 'UsernameOrEmailInvalidException'}, 400);
    }
    if (!password || password.length < 6) {
      return lambdaResponse({name: 'PasswordInvalidException'}, 400);
    }
    const provider = new CognitoIdentityProvider({region: process.env.region});
    const loginParams: AdminInitiateAuthCommandInput = {
      UserPoolId: process.env.userPoolId,
      ClientId: process.env.userPoolClientId,
      AuthFlow: 'ADMIN_NO_SRP_AUTH',
      AuthParameters: {
        USERNAME: identity,
        PASSWORD: password,
      },
    };
    const {AuthenticationResult: tokens} = await provider.adminInitiateAuth(
      loginParams,
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
