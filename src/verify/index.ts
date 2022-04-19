/* eslint-disable @typescript-eslint/require-await */
import {APIGatewayProxyEventV2, APIGatewayProxyResult} from 'aws-lambda';
import {CognitoIdentityProvider} from '@aws-sdk/client-cognito-identity-provider';
import {getCookieValue, lambdaResponse} from '../../lib/utils';

export async function verify(
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResult> {
  try {
    const provider = new CognitoIdentityProvider({region: process.env.region});
    const args = {
      AccessToken: getCookieValue(event, 'AccessToken'), // event.headers.authorization,
      AttributeName: 'email',
    };

    // 👇 send or verify code based on query params
    const code = event.queryStringParameters?.code;
    if (code) {
      await provider.verifyUserAttribute({
        ...args,
        Code: code,
      });
    } else {
      await provider.getUserAttributeVerificationCode(args);
    }

    return {
      body: '',
      statusCode: 204,
    };
  } catch (error) {
    return lambdaResponse(error, 500);
  }
}
