/* eslint-disable @typescript-eslint/require-await */
import {APIGatewayProxyEventV2} from 'aws-lambda';
import {CognitoJwtVerifier} from 'aws-jwt-verify';

import {
  CognitoJwtVerifierProperties,
  CognitoVerifyProperties,
} from 'aws-jwt-verify/cognito-verifier';
import {CognitoJwtPayload} from 'aws-jwt-verify/jwt-model';
import {
  CognitoIdentityProvider,
  GetUserCommandOutput,
} from '@aws-sdk/client-cognito-identity-provider';
import {getCookieValue} from '../../lib/utils';

interface Result {
  isAuthorized: boolean;
  context?: {
    [key: string]: CognitoJwtPayload | GetUserCommandOutput;
  };
}
export async function authorizer(
  event: APIGatewayProxyEventV2,
): Promise<Result> {
  const result: Result = {
    isAuthorized: false,
  };

  try {
    const verifyProperties: {
      userPoolId: string;
    } & Partial<CognitoVerifyProperties> &
      Partial<CognitoJwtVerifierProperties> = {
      tokenUse: 'access',
      userPoolId: process.env.userPoolId!,
      clientId: process.env.userPoolClientId!,
    };
    // Verifier access tokens:
    const accessVerifier = CognitoJwtVerifier.create(verifyProperties);
    const accessToken = getCookieValue(event, 'AccessToken');
    const accessPayload = await accessVerifier.verify(accessToken, {
      tokenUse: verifyProperties.tokenUse!,
      clientId: verifyProperties.clientId!,
    });

    // Verifier id access tokens:
    verifyProperties.tokenUse = 'id';
    const idVerifier = CognitoJwtVerifier.create(verifyProperties);
    const idToken = getCookieValue(event, 'IdToken');
    const idPayload = await idVerifier.verify(idToken, {
      tokenUse: verifyProperties.tokenUse,
      clientId: verifyProperties.clientId!,
    });

    if (
      accessPayload.sub !== idPayload.sub || // same authenticated user
      accessPayload.exp !== idPayload.exp || // same expiry time
      accessPayload.origin_jti !== idPayload.origin_jti // same token origin i.e not authenticated again
    )
      return result;

    // Check access token is valid
    const provider = new CognitoIdentityProvider({
      region: process.env.region,
    });
    const user = await provider.getUser({
      AccessToken: accessToken,
    });

    result.context = {
      accessPayload,
      idPayload,
      user,
    };

    result.isAuthorized = true;

    return result;
  } catch {
    return result;
  }
}
