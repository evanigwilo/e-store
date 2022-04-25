/* eslint-disable @typescript-eslint/require-await */
import {APIGatewayProxyResult} from 'aws-lambda';

import {lambdaResponse, supportedCategories} from '../../lib/utils';

export async function category(): Promise<APIGatewayProxyResult> {
  try {
    return lambdaResponse(supportedCategories, 200);
  } catch (error) {
    return lambdaResponse(error, 500);
  }
}
