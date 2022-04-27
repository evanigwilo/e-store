import {
  expect as expectCDK,
  haveResourceLike,
  ResourcePart,
  countResources,
} from '@aws-cdk/assert';
import '@aws-cdk/assert/jest';
import {Capture, Template} from 'aws-cdk-lib/assertions';
import {App} from 'aws-cdk-lib';
import {HttpMethod} from '@aws-cdk/aws-apigatewayv2-alpha';
import {constants, origins, S3Constants} from '../../lib/utils';
import {CdkStack} from '../../lib';

describe('CDK Resources', () => {
  const app = new App();
  // WHEN
  const stack = new CdkStack(app, 'cdk-stack');
  const apiName = 'api';
  const userPoolName = 'userpool';
  const userPoolClient = 'userpoolclient';
  const patternUserPoolId = `cognito${userPoolName}`;
  const patternApi = `apigateway${apiName}`;
  const patternUserPoolClientId = `cognito${userPoolClient}`;
  const patternManageProductGroup = `userGroups${constants.groups.product.replace(
    /_/g,
    '',
  )}pool`;
  const bucketName = S3Constants.productImages;
  const {productTable} = constants;
  let captureUserPoolId = new Capture();
  // console.log(Template.fromStack(stack).toJSON());
  const expectDeletePolicy = (type: string) => {
    // Template.fromStack(stack).hasResource(type, {
    //   UpdateReplacePolicy: "Delete",
    //   DeletionPolicy: "Delete"
    // });
    expect(stack).toHaveResource(
      type,
      {
        UpdateReplacePolicy: 'Delete',
        DeletionPolicy: 'Delete',
      },
      ResourcePart.CompleteDefinition,
    );
  };
  const expectUserPoolID = () => {
    expect(captureUserPoolId.asString()).toMatch(
      new RegExp(`^${patternUserPoolId}?`, 'i'),
    ); // Case-insensitive start's with
  };
  const lambdaRoles = (managedPolicyArns: string[]) => {
    managedPolicyArns.unshift('service-role/AWSLambdaBasicExecutionRole');
    return {
      AssumeRolePolicyDocument: {
        Statement: [
          {
            Action: 'sts:AssumeRole',
            Effect: 'Allow',
            Principal: {
              Service: 'lambda.amazonaws.com',
            },
          },
        ],
        Version: '2012-10-17',
      },
      ManagedPolicyArns: managedPolicyArns.map(policy => ({
        'Fn::Join': [
          '',
          [
            'arn:',
            {
              Ref: 'AWS::Partition',
            },
            `:iam::aws:policy/${policy}`,
          ],
        ],
      })),
    };
  };
  const lambdaFunctionTest = (handler: string, role: string) => {
    Template.fromStack(stack).hasResource('AWS::Lambda::Function', {
      Properties: {
        Handler: `index.${handler}`,
        Runtime: 'nodejs16.x',
        Role: {
          'Fn::GetAtt': [role, 'Arn'],
        },
      },
      DependsOn: [role],
    });
  };
  const apiGatewayRoute = (
    route: string,
    httpMethod: HttpMethod,
    authorizationType: 'NONE' | 'JWT' | 'CUSTOM',
    apiVersion = 'v1',
  ) => {
    const capture = new Capture();
    Template.fromStack(stack).hasResourceProperties(
      'AWS::ApiGatewayV2::Route',
      {
        ApiId: {
          Ref: capture,
        },
        RouteKey: `${httpMethod} /${apiVersion}/${route}`,
        AuthorizationType: authorizationType,
      },
    );
    expect(capture.asString()).toMatch(new RegExp(`^${patternApi}?`, 'i')); // Case-insensitive start's with
  };
  afterEach(() => {
    captureUserPoolId = new Capture();
  });
  test('S3 Buckets Created', () => {
    expectCDK(stack).to(countResources('AWS::S3::Bucket', 1));
    expectCDK(stack).to(
      haveResourceLike('AWS::S3::Bucket', {
        BucketEncryption: {
          ServerSideEncryptionConfiguration: [
            {
              ServerSideEncryptionByDefault: {
                SSEAlgorithm: 'AES256',
              },
            },
          ],
        },
        BucketName: bucketName,
        CorsConfiguration: {
          CorsRules: [
            {
              AllowedHeaders: ['*'],
              AllowedMethods: ['GET', 'POST', 'PUT'],
              AllowedOrigins: origins,
            },
          ],
        },
        LifecycleConfiguration: {
          Rules: [
            {
              AbortIncompleteMultipartUpload: {
                DaysAfterInitiation: 90,
              },
              Status: 'Enabled',
              Transitions: [
                {
                  StorageClass: 'STANDARD_IA',
                  TransitionInDays: 30,
                },
              ],
            },
          ],
        },
      }),
    );
    expectCDK(stack).to(
      haveResourceLike('Custom::S3BucketNotifications', {
        NotificationConfiguration: {
          LambdaFunctionConfigurations: [
            {
              Events: ['s3:ObjectCreated:*'],
              LambdaFunctionArn: {
                'Fn::GetAtt': ['s3Event', 'Arn'],
              },
            },
          ],
        },
      }),
    );
    expectDeletePolicy('AWS::S3::Bucket');
  });
  test('IAM Roles for Lambda Created', () => {
    expectDeletePolicy('AWS::IAM::Role');

    // AWSLambdaBasicExecutionRole
    Template.fromStack(stack).hasResourceProperties(
      'AWS::IAM::Role',
      lambdaRoles([]),
    );
    // AmazonCognitoPowerUser
    Template.fromStack(stack).hasResourceProperties(
      'AWS::IAM::Role',
      lambdaRoles(['AmazonCognitoPowerUser']),
    );
    // AmazonSSMFullAccess
    /*
    Template.fromStack(stack).hasResourceProperties('AWS::IAM::Role',
      lambdaRoles(["AmazonSSMFullAccess"])
    );
    */
    // AmazonDynamoDBFullAccess
    Template.fromStack(stack).hasResourceProperties(
      'AWS::IAM::Role',
      lambdaRoles(['AmazonDynamoDBFullAccess']),
    );
    // AmazonDynamoDBFullAccessWithSSMFullAccess
    Template.fromStack(stack).hasResourceProperties(
      'AWS::IAM::Role',
      lambdaRoles(['AmazonDynamoDBFullAccess', 'AmazonSSMFullAccess']),
    );
    // AmazonS3FullAccess
    Template.fromStack(stack).hasResourceProperties(
      'AWS::IAM::Role',
      lambdaRoles([
        'AmazonDynamoDBFullAccess',
        'AmazonSSMFullAccess',
        'AmazonS3FullAccess',
      ]),
    );
  });
  test('IAM Roles for UserGroups Created', () => {
    const capture = new Capture();
    Template.fromStack(stack).hasResource('AWS::IAM::Role', {
      Properties: {
        AssumeRolePolicyDocument: {
          Statement: [
            {
              Action: 'sts:AssumeRoleWithWebIdentity',
              Effect: 'Allow',
              Principal: {
                Federated: 'cognito-identity.amazonaws.com',
              },
              Condition: {
                StringEquals: {
                  'cognito-identity.amazonaws.com:aud': {
                    Ref: capture,
                  },
                },
              },
            },
          ],
          Version: '2012-10-17',
        },
        Policies: [
          {
            PolicyDocument: {
              Statement: [
                {
                  Action: ['dynamodb:PutItem', 'dynamodb:DeleteItem'],
                  Condition: {
                    'ForAllValues:StringEquals': {
                      'dynamodb:LeadingKeys': [
                        '${cognito-identity.amazonaws.com:sub}',
                      ],
                    },
                  },
                  Effect: 'Allow',
                  Resource: {
                    'Fn::Join': [
                      '',
                      [
                        '"arn:aws:dynamodb:',
                        {
                          Ref: 'AWS::Region',
                        },
                        ':',
                        {
                          Ref: 'AWS::AccountId',
                        },
                        `:table/${productTable}"`,
                      ],
                    ],
                  },
                },
              ],
              Version: '2012-10-17',
            },
            PolicyName: 'manageProductPolicy',
          },
        ],
      },
      UpdateReplacePolicy: 'Delete',
      DeletionPolicy: 'Delete',
    });
    expect(capture.asString()).toMatch(
      new RegExp(`^${patternManageProductGroup}?`, 'i'),
    ); // Case-insensitive start's with
  });
  test('ApiGateway Created', () => {
    // THEN
    expectCDK(stack).to(
      haveResourceLike('AWS::ApiGatewayV2::Api', {
        CorsConfiguration: {
          AllowCredentials: true,
          AllowHeaders: [
            'Content-Type',
            'X-Amz-Date',
            'Authorization',
            'X-Api-Key',
          ],
          AllowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
          AllowOrigins: origins,
        },
        Name: apiName,
        ProtocolType: 'HTTP',
      }),
    );
    expectDeletePolicy('AWS::ApiGatewayV2::Api');
  });
  test('ApiGateway Route Created', () => {
    apiGatewayRoute('auth', HttpMethod.GET, 'CUSTOM');
    apiGatewayRoute('users', HttpMethod.GET, 'CUSTOM');
    apiGatewayRoute('register', HttpMethod.POST, 'NONE');
    apiGatewayRoute('login', HttpMethod.POST, 'NONE');
    apiGatewayRoute('logout', HttpMethod.POST, 'NONE');
    apiGatewayRoute('refresh', HttpMethod.POST, 'NONE');
    apiGatewayRoute('verify', HttpMethod.POST, 'CUSTOM');
    apiGatewayRoute('user-group/{groupname}', HttpMethod.POST, 'CUSTOM');
    apiGatewayRoute('user-group/{groupname}', HttpMethod.DELETE, 'CUSTOM');
    apiGatewayRoute('payment/hook', HttpMethod.POST, 'NONE');
    apiGatewayRoute('payment/checkout', HttpMethod.POST, 'CUSTOM');
    // apiGatewayRoute('product', HttpMethod.GET, 'NONE');
    apiGatewayRoute('products', HttpMethod.POST, 'NONE');
    apiGatewayRoute('product', HttpMethod.POST, 'CUSTOM');
    apiGatewayRoute('product/{id}', HttpMethod.GET, 'NONE');
    apiGatewayRoute('product/{id}', HttpMethod.PUT, 'CUSTOM');
    apiGatewayRoute('product/{id}', HttpMethod.DELETE, 'CUSTOM');
    apiGatewayRoute('product/{id}/image', HttpMethod.POST, 'CUSTOM');
    apiGatewayRoute('product/{id}/image', HttpMethod.DELETE, 'CUSTOM');
    apiGatewayRoute('order', HttpMethod.POST, 'CUSTOM');
    apiGatewayRoute('order/create', HttpMethod.POST, 'CUSTOM');
    apiGatewayRoute('order/{intent}', HttpMethod.POST, 'CUSTOM');
    apiGatewayRoute('country', HttpMethod.GET, 'NONE');
    apiGatewayRoute('category', HttpMethod.GET, 'NONE');
  });
  test('Cognito Pools Created', () => {
    // THEN
    expectCDK(stack).to(
      haveResourceLike('AWS::Cognito::UserPool', {
        AccountRecoverySetting: {
          RecoveryMechanisms: [
            {
              Name: 'verified_email',
              Priority: 1,
            },
          ],
        },
        AliasAttributes: ['email'],
        AutoVerifiedAttributes: ['email'],
        Policies: {
          PasswordPolicy: {
            MinimumLength: 6,
            RequireLowercase: false,
            RequireNumbers: false,
            RequireSymbols: false,
            RequireUppercase: false,
          },
        },
        UserPoolName: userPoolName,
      }),
    );
    expectDeletePolicy('AWS::Cognito::UserPool');
    Template.fromStack(stack).hasResourceProperties(
      'AWS::Cognito::UserPoolClient',
      {
        UserPoolId: {
          Ref: captureUserPoolId,
        },
        ExplicitAuthFlows: [
          'ALLOW_USER_PASSWORD_AUTH',
          'ALLOW_ADMIN_USER_PASSWORD_AUTH',
          'ALLOW_CUSTOM_AUTH',
          'ALLOW_USER_SRP_AUTH',
          'ALLOW_REFRESH_TOKEN_AUTH',
        ],
        SupportedIdentityProviders: ['COGNITO'],
        TokenValidityUnits: {
          AccessToken: 'minutes',
          IdToken: 'minutes',
          RefreshToken: 'minutes',
        },
        AccessTokenValidity: 60,
        IdTokenValidity: 60,
        RefreshTokenValidity: 60 * 24,
      },
    );
    expectUserPoolID();
    expectDeletePolicy('AWS::Cognito::UserPoolClient');
  });
  test('UserPoolGroups Created', () => {
    expectCDK(stack).to(countResources('AWS::Cognito::UserPoolGroup', 2));
    Template.fromStack(stack).hasResource('AWS::Cognito::UserPoolGroup', {
      Properties: {
        UserPoolId: {
          Ref: captureUserPoolId,
        },
        Description: 'For Admins',
        GroupName: constants.groups.admin,
      },
      UpdateReplacePolicy: 'Delete',
      DeletionPolicy: 'Delete',
    });
    expectUserPoolID();
    // manage_product_group
    Template.fromStack(stack).hasResource('AWS::Cognito::UserPoolGroup', {
      Properties: {
        UserPoolId: {
          Ref: captureUserPoolId,
        },
        Description: 'For Managing Products',
        GroupName: constants.groups.product,
        RoleArn: {
          'Fn::GetAtt': ['manageProductRole', 'Arn'],
        },
      },
      UpdateReplacePolicy: 'Delete',
      DeletionPolicy: 'Delete',
    });
    expectUserPoolID();
  });
  test('IdentityPools Created', () => {
    const capture1 = new Capture();
    Template.fromStack(stack).hasResource('AWS::Cognito::IdentityPool', {
      Properties: {
        AllowUnauthenticatedIdentities: false,
        CognitoIdentityProviders: [
          {
            ClientId: {
              Ref: capture1,
            },
            ProviderName: {
              'Fn::GetAtt': [captureUserPoolId, 'ProviderName'],
            },
          },
        ],
        IdentityPoolName: `${constants.groups.product}_pool`,
      },
      UpdateReplacePolicy: 'Delete',
      DeletionPolicy: 'Delete',
    });
    expectUserPoolID();
    expect(capture1.asString()).toMatch(
      new RegExp(`^${patternUserPoolClientId}?`, 'i'),
    ); // Case-insensitive start's with
    const capture2 = new Capture();
    Template.fromStack(stack).hasResource(
      'AWS::Cognito::IdentityPoolRoleAttachment',
      {
        Properties: {
          IdentityPoolId: {
            Ref: capture2,
          },
          RoleMappings: {
            mapping: {
              AmbiguousRoleResolution: 'Deny',
              IdentityProvider: {
                'Fn::Join': [
                  '',
                  [
                    {
                      'Fn::GetAtt': [captureUserPoolId, 'ProviderName'],
                    },
                    ':',
                    {
                      Ref: capture1,
                    },
                  ],
                ],
              },
              Type: 'Token',
            },
          },
          Roles: {
            authenticated: {
              'Fn::GetAtt': ['AmazonCognitoPowerUser', 'Arn'],
            },
            unauthenticated: {
              'Fn::GetAtt': ['AmazonCognitoPowerUser', 'Arn'],
            },
          },
        },
      },
    );
    expectUserPoolID();
    expect(capture1.asString()).toMatch(
      new RegExp(`^${patternUserPoolClientId}?`, 'i'),
    ); // Case-insensitive start's with
    expect(capture2.asString()).toMatch(
      new RegExp(`^${patternManageProductGroup}?`, 'i'),
    ); // Case-insensitive start's with
  });
  test('Lambda Authorizer Created', () => {
    // const capture1 = new Capture();
    const capture2 = new Capture();
    Template.fromStack(stack).hasResource('AWS::ApiGatewayV2::Authorizer', {
      Properties: {
        ApiId: {
          Ref: capture2,
        },
        AuthorizerType: 'REQUEST', // 'JWT',
        Name: 'lambdaAuthorizer',
        IdentitySource: [], // ['$request.header.Authorization'],
        EnableSimpleResponses: true,
        AuthorizerResultTtlInSeconds: 0,
        /*
        JwtConfiguration: {
          Audience: [
            {
              Ref: capture1,
            },
          ],
          Issuer: {
            'Fn::Join': [
              '',
              [
                'https://cognito-idp.',
                {
                  Ref: 'AWS::Region',
                },
                '.amazonaws.com/',
                {
                  Ref: captureUserPoolId,
                },
              ],
            ],
          },
        },
        */
      },
    });
    /*
      expectUserPoolID();
      expect(capture1.asString()).toMatch(
        new RegExp(`^${patternUserPoolClientId}?`, 'i'),
      ); // Case-insensitive start's with
    */
    expect(capture2.asString()).toMatch(new RegExp(`^${patternApi}?`, 'i')); // Case-insensitive start's with
  });
  test('DynamoDB Tables Created', () => {
    expectCDK(stack).to(countResources('AWS::DynamoDB::Table', 2));
    expectCDK(stack).to(
      countResources('AWS::ApplicationAutoScaling::ScalableTarget', 2),
    );
    expectCDK(stack).to(
      countResources('AWS::ApplicationAutoScaling::ScalingPolicy', 2),
    );
    // productTable
    Template.fromStack(stack).hasResource('AWS::DynamoDB::Table', {
      Properties: {
        KeySchema: [
          {
            AttributeName: 'id',
            KeyType: 'HASH',
          },
        ],
        AttributeDefinitions: [
          {
            AttributeName: 'id',
            AttributeType: 'S',
          },
          {
            AttributeName: 'category',
            AttributeType: 'S',
          },
          {
            AttributeName: 'price',
            AttributeType: 'N',
          },
        ],
        GlobalSecondaryIndexes: [
          {
            IndexName: constants.categoryIndex,
            KeySchema: [
              {
                AttributeName: 'category',
                KeyType: 'HASH',
              },
              {
                AttributeName: 'price',
                KeyType: 'RANGE',
              },
            ],
            Projection: {
              ProjectionType: 'ALL',
            },
            ProvisionedThroughput: {
              ReadCapacityUnits: 1,
              WriteCapacityUnits: 1,
            },
          },
        ],
        PointInTimeRecoverySpecification: {
          PointInTimeRecoveryEnabled: true,
        },
        ProvisionedThroughput: {
          ReadCapacityUnits: 1,
          WriteCapacityUnits: 1,
        },
        TableName: constants.productTable,
      },
      UpdateReplacePolicy: 'Delete',
      DeletionPolicy: 'Delete',
    });
    // orderTable
    Template.fromStack(stack).hasResource('AWS::DynamoDB::Table', {
      Properties: {
        KeySchema: [
          {
            AttributeName: 'user',
            KeyType: 'HASH',
          },
          {
            AttributeName: 'intent',
            KeyType: 'RANGE',
          },
        ],
        AttributeDefinitions: [
          {
            AttributeName: 'user',
            AttributeType: 'S',
          },
          {
            AttributeName: 'intent',
            AttributeType: 'S',
          },
        ],
        PointInTimeRecoverySpecification: {
          PointInTimeRecoveryEnabled: true,
        },
        ProvisionedThroughput: {
          ReadCapacityUnits: 1,
          WriteCapacityUnits: 1,
        },
        TableName: constants.orderTable,
      },
      UpdateReplacePolicy: 'Delete',
      DeletionPolicy: 'Delete',
    });
  });
  test('Lambda Functions Created', () => {
    lambdaFunctionTest('auth', 'AmazonCognitoPowerUser');
    lambdaFunctionTest('users', 'AmazonCognitoPowerUser');
    lambdaFunctionTest('authorizer', 'AmazonCognitoPowerUser');
    lambdaFunctionTest('register', 'AmazonCognitoPowerUser');
    lambdaFunctionTest('login', 'AmazonCognitoPowerUser');
    lambdaFunctionTest('logout', 'AmazonCognitoPowerUser');
    lambdaFunctionTest('refresh', 'AmazonCognitoPowerUser');
    lambdaFunctionTest('verify', 'AWSLambdaBasicExecutionRole');
    lambdaFunctionTest('userGroup', 'AmazonCognitoPowerUser');
    lambdaFunctionTest('paymentHook', 'AmazonS3FullAccess');
    lambdaFunctionTest(
      'paymentCheckout',
      'AmazonDynamoDBFullAccessWithSSMFullAccess',
    );
    lambdaFunctionTest('productId', 'AmazonDynamoDBFullAccess');
    lambdaFunctionTest('products', 'AmazonDynamoDBFullAccess');
    lambdaFunctionTest('product', 'AmazonDynamoDBFullAccess');
    lambdaFunctionTest('productImage', 'AmazonS3FullAccess');
    lambdaFunctionTest('order', 'AmazonDynamoDBFullAccess');
    lambdaFunctionTest('orderCreate', 'AmazonDynamoDBFullAccess');
    lambdaFunctionTest('orderIntent', 'AmazonDynamoDBFullAccess');
    lambdaFunctionTest('s3Event', 'AmazonDynamoDBFullAccess');
    lambdaFunctionTest('country', 'AWSLambdaBasicExecutionRole');
    lambdaFunctionTest('category', 'AWSLambdaBasicExecutionRole');
  });
});
