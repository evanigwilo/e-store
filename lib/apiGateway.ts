import {CorsHttpMethod, HttpApi} from '@aws-cdk/aws-apigatewayv2-alpha';
import {RemovalPolicy} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {origins} from './utils';

export class ApiGateway extends Construct {
  public readonly httpApi: HttpApi;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    // 👇 create the API
    this.httpApi = new HttpApi(this, 'api', {
      apiName: 'api',
      corsPreflight: {
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
        ],
        allowMethods: [
          CorsHttpMethod.GET,
          CorsHttpMethod.POST,
          CorsHttpMethod.PUT,
          CorsHttpMethod.DELETE,
          //   CorsHttpMethod.OPTIONS,
          //   CorsHttpMethod.PATCH,
        ],
        allowCredentials: true,
        allowOrigins: origins,
      },
    });
    this.httpApi.applyRemovalPolicy(RemovalPolicy.DESTROY);
  }
}
