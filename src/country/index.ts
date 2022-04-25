/* eslint-disable @typescript-eslint/require-await */
import {APIGatewayProxyResult} from 'aws-lambda';

import {lambdaResponse, supportedCountries} from '../../lib/utils';

export async function country(): Promise<APIGatewayProxyResult> {
  try {
    return lambdaResponse(supportedCountries, 200);
  } catch (error) {
    return lambdaResponse(error, 500);
  }
}
