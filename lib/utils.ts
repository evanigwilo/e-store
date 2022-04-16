import {
  APIGatewayProxyEventV2,
  APIGatewayProxyResult,
} from 'aws-lambda/trigger/api-gateway-proxy';
import {
  AuthenticationResultType,
  GetUserCommandOutput,
  GroupType,
} from '@aws-sdk/client-cognito-identity-provider';

import cookie from 'cookie';

/*
Types
*/
export interface KeyValue<T = string> {
  [key: string]: T;
}
export interface LambdaRequestContext {
  lambda: {
    accessPayload: {
      'cognito:groups'?: string[];
      username?: string;
    };
    user?: GetUserCommandOutput;
  };
}
/*
Method
*/
export const getCookieValue = (
  event: APIGatewayProxyEventV2,
  key: typeof tokenParams[number],
) => {
  if (!event.cookies) return '';
  const {cookies} = event;
  const search = `${key.toLowerCase()}=`;
  for (const cookie of cookies) {
    if (cookie.toLowerCase().startsWith(search)) {
      return cookie.substring(search.length);
    }
  }
  return '';
};
export const lambdaResponse = (
  value: any,
  statusCode: number,
  contentType: KeyValue = {'Content-Type': 'application/json'},
): APIGatewayProxyResult => {
  // if (statusCode === 400 || statusCode === 500) {
  //   value = {
  //     error: value,
  //   };
  // }
  return {
    headers: contentType,
    body: JSON.stringify(value),
    statusCode,
  } as APIGatewayProxyResult;
};
export const tokensToCookies = (tokens?: AuthenticationResultType) => {
  const cookies: string[] = [];
  const options: cookie.CookieSerializeOptions = {
    httpOnly: true,
    // Safari does not save cookies if sameSite:secure and client is not https://
    secure: true,
    sameSite: 'strict',
    path: '/',
    domain: tokenDomain,
  };
  if (!tokens) {
    tokenParams.forEach(token => {
      cookies.push(
        cookie.serialize(token, '', {
          maxAge: 0,
          ...options,
        }),
      );
    });
  } else {
    tokenParams.forEach(token => {
      const value = tokens[token as keyof typeof tokens] as string;
      if (value) {
        cookies.push(
          cookie.serialize(token, value, {
            // in seconds
            maxAge: 60 * 60 * 24, // 1day
            ...options,
          }),
        );
      }
    });
  }
  return cookies;
};
export const userProperties = (
  groups?: GroupType[],
  user?: GetUserCommandOutput,
) => {
  const admin =
    groups?.some(({GroupName}) => GroupName === constants.groups.admin) ===
    true;
  const manageProducts =
    groups?.some(({GroupName}) => GroupName === constants.groups.product) ===
    true;
  const emailVerified =
    user?.UserAttributes?.find(
      ({Name, Value}) => Name === 'email_verified' && Value === 'true',
    )?.Value === 'true';

  return {
    admin,
    manageProducts,
    emailVerified,
    username: user?.Username,
  };
};
/*
Constants
*/
export const origins = [
  'http://localhost:3000',
  'https://editor.swagger.io', // Allow testing api from swagger.io origin
  'https://petstore.swagger.io',
  'https://app.e-store.gq',
  'https://en.e-store.gq:3000',
];
export const constants = {
  readsPerQuery: 10,
  orderTable: 'orderTable',
  productTable: 'productTable',
  cartIntent: 'cart',
  cartStatus: 'IN CART',
  orderLogs: '-',
  categoryIndex: 'category-index',
  groups: {
    admin: 'admin_group',
    product: 'manage_product_group',
  },
};
export const S3Constants = {
  productImages: 'bucket-product-images',
};
export const tokenDomain = '.e-store.gq';
const tokenParams = [
  'AccessToken',
  // 'ExpiresIn',
  'IdToken',
  'RefreshToken',
  // 'TokenType',
] as const;
