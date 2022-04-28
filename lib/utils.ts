import {
  APIGatewayProxyEventV2,
  APIGatewayProxyResult,
} from 'aws-lambda/trigger/api-gateway-proxy';
import {
  AuthenticationResultType,
  GetUserCommandOutput,
  GroupType,
} from '@aws-sdk/client-cognito-identity-provider';
import {CognitoIdentityCredentials} from 'aws-sdk';
import {
  AttributeValue,
  DynamoDBClient,
  QueryCommandInput,
  QueryCommand,
  ScanCommand,
  UpdateItemCommandInput,
  UpdateItemCommand,
  BatchGetItemCommandInput,
  BatchGetItemCommand,
} from '@aws-sdk/client-dynamodb';
import {marshall, unmarshall} from '@aws-sdk/util-dynamodb';

import cookie from 'cookie';
import SSM from 'aws-sdk/clients/ssm';
import Stripe from 'stripe';

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
export type ImageSlot = {
  [key in 'image_1' | 'image_2' | 'image_3']?: boolean;
};
export type ProductTable = ImageSlot & {
  id: string;
  name: string;
  category: string;
  price: number;
  createdAt: number;
};
interface OrderTableOrders {
  productId: string;
  name: string;
  category: string;
  price: number;
  count: number;
  slot: number;
}
interface OrderLocation {
  country: string;
  // city: string,
  address: string;
}
export interface Orders {
  productId: string;
  count: number;
}
export interface OrderTable {
  user: string;
  orders: OrderTableOrders[];
  amount: number;
  status: string;
  logs: string;
  intent: string;
  createdAt: number;
  location?: OrderLocation;
}
export type OrderTableKeys = keyof OrderTable;
interface Country {
  code: string;
  name: string;
  emoji: string;
  unicode: string;
  image: string;
}
export type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>;
    }
  : T;
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
export const isAdmin = (event: APIGatewayProxyEventV2) => {
  const claims = event.requestContext
    .authorizer as unknown as LambdaRequestContext;
  return (
    claims?.lambda.accessPayload['cognito:groups']?.includes(
      constants.groups.admin,
    ) === true
  );

  /*
  const claims = event.requestContext.authorizer?.jwt.claims;
  return (
    claims &&
    typeof claims['cognito:groups'] === 'string' &&
    claims['cognito:groups'].includes('admin_group')
  );
  */
};
export const strLower = (str: string, capitalize = true) => {
  str = str.replace(/\s\s+/g, ' ').trim();
  if (capitalize) {
    let upper = true;
    let newStr = '';
    for (let i = 0, l = str.length; i < l; i++) {
      if (str[i] === ' ') {
        upper = true;
        newStr += ' ';
        continue;
      } else if (str[i] === '-') {
        upper = true;
        newStr += '-';
        continue;
      }
      newStr += upper ? str[i].toUpperCase() : str[i].toLowerCase();
      upper = false;
    }
    return newStr;
  }
  return str.toLowerCase();
  // return capitalize
  //   ? str.charAt(0).toUpperCase() + str.slice(1).toLocaleLowerCase()
  //   : str.toLowerCase();
};
export const validIntNumber = (number: string) => /^[0-9]+$/.test(number);
export const validFloatNumber = (price: string) => {
  const validFloatNumber =
    /[0-9]/.test(price) && /^[+-]?(\d*)[.]?(\d*)$/.test(price);
  return validFloatNumber;
};
export const UpdateItem = async (
  ddbClient: DynamoDBClient,
  tableName: string,
  item: any,
  indexKeys: any,
) => {
  const keys = Object.keys(item);
  const params: UpdateItemCommandInput = {
    TableName: tableName,
    Key: marshall(indexKeys),
    UpdateExpression: `SET ${keys
      .map((_, index) => `#key${index} = :value${index}`)
      .join(', ')}`,
    ExpressionAttributeNames: keys.reduce(
      (acc, key, index) => ({
        ...acc,
        [`#key${index}`]: key,
      }),
      {},
    ),
    ExpressionAttributeValues: marshall(
      keys.reduce(
        (acc, key, index) => ({
          ...acc,
          [`:value${index}`]: item[key],
        }),
        {},
      ),
    ),
  };
  const updateResult = await ddbClient.send(new UpdateItemCommand(params));
  return updateResult;
};
export const addItems = (
  items: KeyValue<AttributeValue>[],
  queryResult: KeyValue<any>[],
  limit: number,
) => {
  items.some(item => {
    if (queryResult.length < limit) {
      queryResult.push(unmarshall(item));
      return false;
    }
    return true;
  });
};
export const queryItems = async (
  ddbClient: DynamoDBClient,
  params: QueryCommandInput,
  limit: number,
  query = true,
) => {
  const queryResult: KeyValue<any>[] = [];
  do {
    const {Items, LastEvaluatedKey} = await ddbClient.send(
      query ? new QueryCommand(params) : new ScanCommand(params),
    );
    if (Items) {
      addItems(Items, queryResult, limit);
      params.ExclusiveStartKey = LastEvaluatedKey;
    }
  } while (params.ExclusiveStartKey && queryResult.length < limit);

  return lambdaResponse(
    {
      lastKey: params.ExclusiveStartKey,
      queryResult,
    },
    200,
  );
};
export const getCredentials = async (
  identityPoolId: string,
  event: APIGatewayProxyEventV2,
) => {
  if (isAdmin(event)) {
    return 'Admin Rights';
  }
  const key = `cognito-idp.${process.env.region}.amazonaws.com/${process.env.userPoolId}`;
  const value = getCookieValue(event, 'IdToken'); // event.headers.authorization!;
  const credentials = new CognitoIdentityCredentials({
    IdentityPoolId: identityPoolId,
    Logins: {
      [key]: value,
    },
  });

  await credentials.getPromise();
  return credentials;
};
export const propTrim = (obj: any) => {
  for (const key in obj) {
    if (typeof obj[key] === 'string') {
      obj[key] = obj[key].trim();
    }
  }
};
export const imageToSlot = (obj: ImageSlot) => {
  const slot = obj.image_1 ? 1 : obj.image_2 ? 2 : obj.image_3 ? 3 : 0;
  return slot;
};
export const getProductsById = async (
  id: string[],
  ddbClient: DynamoDBClient,
) => {
  const {productTable} = constants;
  const products: KeyValue<ProductTable> = {};
  const size = 100; // GetItem in Batches of 100
  for (let i = 0; i < id.length; i += size) {
    const ids = id.slice(i, i + size).map(productId => {
      return {id: {S: productId}};
    });
    const params: BatchGetItemCommandInput = {
      RequestItems: {
        [productTable]: {
          Keys: ids,
          ProjectionExpression:
            'id, #name, category, price, image_1, image_2, image_3',
          ExpressionAttributeNames: {
            '#name': 'name',
          },
        },
      },
    };
    const createResult = await ddbClient.send(new BatchGetItemCommand(params));
    // console.log({createResult});
    const response = createResult.Responses;
    // console.log({response});

    response &&
      response[productTable].forEach(currentItem => {
        const item = unmarshall(currentItem) as ProductTable;
        products[item.id] = item;
      });
  }
  return products;
};
export const stripe = (apiKey: string) => {
  const stripe = new Stripe(apiKey, {
    apiVersion: '2020-08-27',
    typescript: true,
  });
  return stripe;
};
export const loadConfig = async function (parameterName: string) {
  const ssm = new SSM();
  const {Parameter} = await ssm
    .getParameter({Name: parameterName, WithDecryption: true})
    .promise();
  const value = Parameter?.Value;
  if (!value) return '';
  return JSON.parse(value);
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
export const supportedCategories = [
  'Grocery',
  'Electronics',
  'Health & Beauty',
  'Automobile',
  'Home & Kitchen',
  'Phones & Tablets',
  'Books',
  'Gaming',
  'Fashion',
  'Sports & Outdoors',
];
export enum PaymentStatus {
  CREATED,
  CANCELED,
  SUCCEEDED,
  FAILED,
}
export const supportedCountries: Country[] = [
  {
    code: 'US',
    name: 'United States',
    emoji: '🇺🇸',
    unicode: 'U+1F1FA U+1F1F8',
    image:
      'https://cdn.jsdelivr.net/npm/country-flag-emoji-json@2.0.0/dist/images/US.svg',
  },
  {
    code: 'CN',
    name: 'China',
    emoji: '🇨🇳',
    unicode: 'U+1F1E8 U+1F1F3',
    image:
      'https://cdn.jsdelivr.net/npm/country-flag-emoji-json@2.0.0/dist/images/CN.svg',
  },
  {
    code: 'JP',
    name: 'Japan',
    emoji: '🇯🇵',
    unicode: 'U+1F1EF U+1F1F5',
    image:
      'https://cdn.jsdelivr.net/npm/country-flag-emoji-json@2.0.0/dist/images/JP.svg',
  },
  {
    code: 'DE',
    name: 'Germany',
    emoji: '🇩🇪',
    unicode: 'U+1F1E9 U+1F1EA',
    image:
      'https://cdn.jsdelivr.net/npm/country-flag-emoji-json@2.0.0/dist/images/DE.svg',
  },
  {
    code: 'GB',
    name: 'United Kingdom',
    emoji: '🇬🇧',
    unicode: 'U+1F1EC U+1F1E7',
    image:
      'https://cdn.jsdelivr.net/npm/country-flag-emoji-json@2.0.0/dist/images/GB.svg',
  },
  {
    code: 'IN',
    name: 'India',
    emoji: '🇮🇳',
    unicode: 'U+1F1EE U+1F1F3',
    image:
      'https://cdn.jsdelivr.net/npm/country-flag-emoji-json@2.0.0/dist/images/IN.svg',
  },
  {
    code: 'FR',
    name: 'France',
    emoji: '🇫🇷',
    unicode: 'U+1F1EB U+1F1F7',
    image:
      'https://cdn.jsdelivr.net/npm/country-flag-emoji-json@2.0.0/dist/images/FR.svg',
  },
  {
    code: 'IT',
    name: 'Italy',
    emoji: '🇮🇹',
    unicode: 'U+1F1EE U+1F1F9',
    image:
      'https://cdn.jsdelivr.net/npm/country-flag-emoji-json@2.0.0/dist/images/IT.svg',
  },
  {
    code: 'NG',
    name: 'Nigeria',
    emoji: '🇳🇬',
    unicode: 'U+1F1F3 U+1F1EC',
    image:
      'https://cdn.jsdelivr.net/npm/country-flag-emoji-json@2.0.0/dist/images/NG.svg',
  },
  {
    code: 'EG',
    name: 'Egypt',
    emoji: '🇪🇬',
    unicode: 'U+1F1EA U+1F1EC',
    image:
      'https://cdn.jsdelivr.net/npm/country-flag-emoji-json@2.0.0/dist/images/EG.svg',
  },
  {
    code: 'ZA',
    name: 'South Africa',
    emoji: '🇿🇦',
    unicode: 'U+1F1FF U+1F1E6',
    image:
      'https://cdn.jsdelivr.net/npm/country-flag-emoji-json@2.0.0/dist/images/ZA.svg',
  },
  {
    code: 'GH',
    name: 'Ghana',
    emoji: '🇬🇭',
    unicode: 'U+1F1EC U+1F1ED',
    image:
      'https://cdn.jsdelivr.net/npm/country-flag-emoji-json@2.0.0/dist/images/GH.svg',
  },
];
