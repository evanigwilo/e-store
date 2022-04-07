import {Duration, RemovalPolicy} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {
  UserPool,
  UserPoolClient,
  UserPoolClientIdentityProvider,
  AccountRecovery,
} from 'aws-cdk-lib/aws-cognito';

export class Cognito extends Construct {
  public readonly userPool: UserPool;
  public readonly userPoolClient: UserPoolClient;

  constructor(scope: Construct, id: string) {
    super(scope, id);
    // 👇 create the user pool
    this.userPool = new UserPool(this, 'userpool', {
      userPoolName: 'userpool',
      removalPolicy: RemovalPolicy.DESTROY,
      selfSignUpEnabled: true,
      signInCaseSensitive: false,
      signInAliases: {username: true, email: true},
      // autoVerify: { email: true },
      passwordPolicy: {
        minLength: 6,
        requireLowercase: false,
        requireDigits: false,
        requireUppercase: false,
        requireSymbols: false,
      },
      accountRecovery: AccountRecovery.EMAIL_ONLY,
    });
    // 👇 create the user pool client
    this.userPoolClient = new UserPoolClient(this, 'userpoolclient', {
      userPool: this.userPool,
      accessTokenValidity: Duration.minutes(60),
      idTokenValidity: Duration.minutes(60),
      refreshTokenValidity: Duration.days(1),
      authFlows: {
        adminUserPassword: true,
        userPassword: true,
        custom: true,
        userSrp: true,
      },
      supportedIdentityProviders: [UserPoolClientIdentityProvider.COGNITO],
    });
    this.userPoolClient.applyRemovalPolicy(RemovalPolicy.DESTROY);
  }
}
