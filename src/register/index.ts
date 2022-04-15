import {
  APIGatewayProxyEventV2,
  APIGatewayProxyResult,
  Context,
  Callback,
} from 'aws-lambda';
import {
  CognitoIdentityProvider,
  SignUpCommandInput,
} from '@aws-sdk/client-cognito-identity-provider';
import {validate} from 'email-validator';
import {lambdaResponse, tokensToCookies, userProperties} from '../../lib/utils';

export async function register(
  event: APIGatewayProxyEventV2,
  // context?: Context,
  // callback?: Callback,
): Promise<APIGatewayProxyResult & {cookies?: string[]}> {
  const poolData = {
    UserPoolId: process.env.userPoolId!,
    ClientId: process.env.userPoolClientId!,
  };
  try {
    const body = JSON.parse(event.body || '{}');

    // 👇 check credentials validity
    if (!body.username) {
      return lambdaResponse({name: 'UsernameInvalidException'}, 400);
    }
    const username = (body.username as string).trim().toLowerCase();
    if (username.length < 3 || username.includes(' ')) {
      return lambdaResponse({name: 'UsernameInvalidException'}, 400);
    }
    if (validate(username)) {
      return lambdaResponse({name: 'UsernameIsEmailException'}, 400);
    }
    if (!validate(body?.email)) {
      return lambdaResponse({name: 'EmailInvalidException'}, 400);
    }
    if (
      !body.gender ||
      (!(body.gender as string).match(/^male$/i) &&
        !(body.gender as string).match(/^female$/i))
    ) {
      return lambdaResponse({name: 'GenderInvalidException'}, 400);
    }
    const {email} = body;
    const {password} = body;
    const gender = (body.gender as string).trim().toLowerCase();

    const signUpParams: SignUpCommandInput = {
      ClientId: poolData.ClientId,
      Username: username,
      Password: password,
      UserAttributes: [
        {
          Name: 'email',
          Value: email,
        },
        {
          Name: 'gender',
          Value: gender,
        },
      ],
    };
    const confirmParams = {
      UserPoolId: poolData.UserPoolId,
      Username: username,
    };
    const provider = new CognitoIdentityProvider({region: process.env.region});

    // 👇 check if username already exists
    const users = await provider.listUsers({
      UserPoolId: poolData.UserPoolId,
      AttributesToGet: ['email'],
      Filter: `email="${email}"`,
    });

    if (users.Users!.length > 0) {
      return lambdaResponse({name: 'EmailExistsException'}, 400);
    }

    await provider.signUp(signUpParams);
    await provider.adminConfirmSignUp(confirmParams);

    const {AuthenticationResult: tokens} = await provider.adminInitiateAuth({
      ...poolData,
      AuthFlow: 'ADMIN_NO_SRP_AUTH',
      AuthParameters: {
        USERNAME: username,
        PASSWORD: password,
      },
    });

    // 👇 convert token to cookies
    const cookies = tokensToCookies(tokens);
    return {
      ...lambdaResponse(
        {
          ...userProperties(),
          tokens,
          username,
        },
        200,
      ),
      cookies,
    };
  } catch (error) {
    return lambdaResponse(error, 500);
    // return lambdaResponse({ error, event, context, callback }, 500);
  }
}
