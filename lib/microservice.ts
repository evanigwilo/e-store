import * as apiGatewayIntegrations from '@aws-cdk/aws-apigatewayv2-integrations-alpha';
import {Runtime} from 'aws-cdk-lib/aws-lambda';
import {NodejsFunction} from 'aws-cdk-lib/aws-lambda-nodejs';
import {Role} from 'aws-cdk-lib/aws-iam';
import {join} from 'path';
import {
  AddRoutesOptions,
  HttpApi,
  HttpMethod,
  IHttpRouteAuthorizer,
} from '@aws-cdk/aws-apigatewayv2-alpha';
import {Construct} from 'constructs';
import {CfnElement, Duration} from 'aws-cdk-lib';
import {Bucket, EventType} from 'aws-cdk-lib/aws-s3';
import {LambdaDestination} from 'aws-cdk-lib/aws-s3-notifications';
import {
  HttpLambdaAuthorizer,
  HttpLambdaResponseType,
} from '@aws-cdk/aws-apigatewayv2-authorizers-alpha';
import {KeyValue} from './utils';

interface MicroserviceProps {
  httpApi: HttpApi;
  environment: KeyValue;
  amazonCognitoPowerUser: Role;
  productBucket: Bucket;
  awsLambdaBasicExecutionRole: Role;
  amazonDynamoDBFullAccess: Role;
  amazonDynamoDBFullAccessWithSSMFullAccess: Role;
  amazonS3FullAccess: Role;
  // authorizer: IHttpRouteAuthorizer;
}

export class Microservice extends Construct {
  constructor(scope: Construct, id: string, props: MicroserviceProps) {
    super(scope, id);

    const {
      httpApi,
      environment,
      amazonCognitoPowerUser,
      awsLambdaBasicExecutionRole,
      amazonDynamoDBFullAccess,
      amazonDynamoDBFullAccessWithSSMFullAccess,
      amazonS3FullAccess,
      productBucket,
      // authorizer,
    } = props;

    const apiVersion = 'v1';

    const createFunction = (
      handler: string,
      entry: string,
      role: Role = awsLambdaBasicExecutionRole,
      nodeModules?: string[],
    ) => {
      const nodejsFunction = new NodejsFunction(scope, handler, {
        runtime: Runtime.NODEJS_16_X,
        handler,
        role,
        entry: join(__dirname, `/../src/${entry}/index.ts`),
        bundling: {
          // minify: true,
          // nodeModules: ["aws-lambda", "aws-sdk", "aws-cdk",],
          nodeModules,
          externalModules: [
            'aws-sdk', // Use the 'aws-sdk' available in the Lambda runtime
          ],
        },
        environment,
      });
      (nodejsFunction.node.defaultChild as CfnElement).overrideLogicalId(
        handler,
      );
      return nodejsFunction;
    };
    const createRoute = (
      handler: string,
      entry: string,
      routePath: string,
      methods: HttpMethod[],
      role: Role = awsLambdaBasicExecutionRole,
      authorizer?: IHttpRouteAuthorizer,
      nodeModules?: string[],
    ) => {
      const nodejsFunction = createFunction(handler, entry, role, nodeModules);

      const routesOptions: AddRoutesOptions = {
        integration: new apiGatewayIntegrations.HttpLambdaIntegration(
          handler,
          nodejsFunction,
        ),
        path: `/${apiVersion}${routePath}`,
        methods,
        authorizer,
      };

      return routesOptions;
    };

    // 👇 create the lambda authorizer
    const authorizer = new HttpLambdaAuthorizer(
      'lambdaAuthorizer',
      createFunction('authorizer', 'authorizer', amazonCognitoPowerUser),
      {
        responseTypes: [HttpLambdaResponseType.SIMPLE], // Define if returns simple and/or iam response
        authorizerName: 'lambdaAuthorizer',
        identitySource: [],
        resultsCacheTtl: Duration.seconds(0),
      },
    );
    // 👇 create all lambdas that sits behind the authorizer and set the authorizer on the Route
    httpApi.addRoutes(
      createRoute(
        'register',
        'register',
        '/register',
        [HttpMethod.POST],
        amazonCognitoPowerUser,
      ),
    );
    httpApi.addRoutes(
      createRoute(
        'login',
        'login',
        '/login',
        [HttpMethod.POST],
        amazonCognitoPowerUser,
      ),
    );
    httpApi.addRoutes(
      createRoute(
        'logout',
        'logout',
        '/logout',
        [HttpMethod.POST],
        amazonCognitoPowerUser,
      ),
    );
    httpApi.addRoutes(
      createRoute(
        'refresh',
        'refresh',
        '/refresh',
        [HttpMethod.POST],
        amazonCognitoPowerUser,
      ),
    );
    httpApi.addRoutes(
      createRoute(
        'verify',
        'verify',
        '/verify',
        [HttpMethod.POST],
        undefined,
        authorizer,
      ),
    );
    httpApi.addRoutes(
      createRoute(
        'userGroup',
        'userGroup',
        '/user-group/{groupname}',
        [HttpMethod.POST, HttpMethod.DELETE],
        amazonCognitoPowerUser,
        authorizer,
      ),
    );
    httpApi.addRoutes(
      createRoute(
        'paymentHook',
        'payment/hook',
        '/payment/hook',
        [HttpMethod.POST],
        amazonS3FullAccess,
      ),
    );
    httpApi.addRoutes(
      createRoute(
        'paymentCheckout',
        'payment/checkout',
        '/payment/checkout',
        [HttpMethod.POST],
        amazonDynamoDBFullAccessWithSSMFullAccess,
        authorizer,
      ),
    );
    httpApi.addRoutes(
      createRoute(
        'product',
        'product',
        '/product',
        [HttpMethod.POST],
        amazonDynamoDBFullAccess,
        authorizer,
      ),
    );
    httpApi.addRoutes(
      createRoute(
        'products',
        'products',
        '/products',
        [HttpMethod.POST],
        amazonDynamoDBFullAccess,
      ),
    );
    httpApi.addRoutes(
      createRoute(
        'productImage',
        'product/id/image',
        '/product/{id}/image',
        [HttpMethod.POST, HttpMethod.DELETE],
        amazonS3FullAccess,
        authorizer,
      ),
    );
    httpApi.addRoutes(
      createRoute(
        'orderCreate',
        'order/create',
        '/order/create',
        [HttpMethod.POST],
        amazonDynamoDBFullAccess,
        authorizer,
      ),
    );
    httpApi.addRoutes(
      createRoute(
        'order',
        'order',
        '/order',
        [HttpMethod.POST],
        amazonDynamoDBFullAccess,
        authorizer,
      ),
    );
    httpApi.addRoutes(
      createRoute(
        'orderIntent',
        'order/intent',
        '/order/{intent}',
        [HttpMethod.POST],
        amazonDynamoDBFullAccess,
        authorizer,
      ),
    );
    httpApi.addRoutes(
      createRoute('country', 'country', '/country', [HttpMethod.GET]),
    );
    httpApi.addRoutes(
      createRoute('category', 'category', '/category', [HttpMethod.GET]),
    );
    httpApi.addRoutes(
      createRoute(
        'auth',
        'auth',
        '/auth',
        [HttpMethod.GET],
        amazonCognitoPowerUser,
        authorizer,
      ),
    );
    httpApi.addRoutes(
      createRoute(
        'users',
        'users',
        '/users',
        [HttpMethod.GET],
        amazonCognitoPowerUser,
        authorizer,
      ),
    );

    const productIdOptions: AddRoutesOptions = {
      integration: new apiGatewayIntegrations.HttpLambdaIntegration(
        'productId',
        createFunction('productId', 'product/id', amazonDynamoDBFullAccess),
      ),
      path: `/${apiVersion}/product/{id}`,
    };
    httpApi.addRoutes({
      ...productIdOptions,
      methods: [HttpMethod.GET],
    });
    httpApi.addRoutes({
      ...productIdOptions,
      methods: [HttpMethod.PUT, HttpMethod.DELETE],
      authorizer,
    });

    const s3EventFunction = createFunction(
      's3Event',
      's3Event',
      amazonDynamoDBFullAccess,
    );
    productBucket.addEventNotification(
      EventType.OBJECT_CREATED,
      new LambdaDestination(s3EventFunction),
      // 👇 only invoke lambda if object matches the filter
      // {prefix: 'test/', suffix: '.yaml'},
    );

    /*
    const productOptions: AddRoutesOptions = {
      integration: new apiGatewayIntegrations.HttpLambdaIntegration(
        'product',
        createFunction('product', 'product', amazonDynamoDBFullAccess),
      ),
      path: '/' + apiVersion + '/product',
    };
    httpApi.addRoutes({
      ...productOptions,
      methods: [HttpMethod.GET],
    });
    httpApi.addRoutes({
      ...productOptions,
      methods: [HttpMethod.POST],
      authorizer,
    });
    */

    /*
    httpApi.addRoutes(
      createRoute(
        'productId',
        'product/id',
        '/product/{id}',
        [HttpMethod.GET, HttpMethod.PUT, HttpMethod.DELETE],
        authorizer,
        amazonDynamoDBFullAccess,
      ),
    );
    */
  }
}
