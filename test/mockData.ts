import {tokenDomain} from '../lib/utils';

export const authenticationResult = {
  AccessToken: 'AccessToken',
  ExpiresIn: 3600,
  IdToken: 'IdToken',
  RefreshToken: 'RefreshToken',
  TokenType: 'Bearer',
};
export const cookieValue = [
  'AccessToken=AccessToken',
  'IdToken=IdToken',
  'RefreshToken=RefreshToken',
];

export const cookieData = [
  `AccessToken=AccessToken; Max-Age=86400; Domain=${tokenDomain}; Path=/; HttpOnly; Secure; SameSite=Strict`,
  `IdToken=IdToken; Max-Age=86400; Domain=${tokenDomain}; Path=/; HttpOnly; Secure; SameSite=Strict`,
  `RefreshToken=RefreshToken; Max-Age=86400; Domain=${tokenDomain}; Path=/; HttpOnly; Secure; SameSite=Strict`,
];
export const cookieDataEmpty = [
  `AccessToken=; Max-Age=0; Domain=${tokenDomain}; Path=/; HttpOnly; Secure; SameSite=Strict`,
  `IdToken=; Max-Age=0; Domain=${tokenDomain}; Path=/; HttpOnly; Secure; SameSite=Strict`,
  `RefreshToken=; Max-Age=0; Domain=${tokenDomain}; Path=/; HttpOnly; Secure; SameSite=Strict`,
];
