import {CfnElement, RemovalPolicy} from 'aws-cdk-lib';
import {ManagedPolicy, Role, ServicePrincipal} from 'aws-cdk-lib/aws-iam';
import {Construct} from 'constructs';

export class IdentityManagement extends Construct {
  public readonly AWSLambdaBasicExecutionRole: (id?: string) => Role;
  public readonly AmazonCognitoPowerUser: (id?: string) => Role;
  public readonly AmazonS3FullAccess: (id?: string) => Role;
  public readonly AmazonDynamoDBFullAccess: (id?: string) => Role;
  public readonly AmazonDynamoDBFullAccessWithSSMFullAccess: (
    id?: string,
  ) => Role;
  // public readonly AmazonSSMFullAccess: (id?: string) => Role;

  constructor(scope: Construct, id: string) {
    super(scope, id);
    // 👇 create amazonCognitoPowerUser role
    this.AmazonCognitoPowerUser = (id = 'AmazonCognitoPowerUser') => {
      const role = new Role(this, id, {
        assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
        managedPolicies: [
          ManagedPolicy.fromAwsManagedPolicyName(
            'service-role/AWSLambdaBasicExecutionRole',
          ),
          ManagedPolicy.fromAwsManagedPolicyName('AmazonCognitoPowerUser'),
        ],
      });

      (role.node.defaultChild as CfnElement).overrideLogicalId(id);
      role.applyRemovalPolicy(RemovalPolicy.DESTROY);
      return role;
    };
    // 👇 create AWSLambdaBasicExecutionRole role
    this.AWSLambdaBasicExecutionRole = (id = 'AWSLambdaBasicExecutionRole') => {
      const role = new Role(this, id, {
        assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
        managedPolicies: [
          ManagedPolicy.fromAwsManagedPolicyName(
            'service-role/AWSLambdaBasicExecutionRole',
          ),
        ],
      });

      (role.node.defaultChild as CfnElement).overrideLogicalId(id);
      role.applyRemovalPolicy(RemovalPolicy.DESTROY);
      return role;
    };
    // 👇 create AmazonDynamoDBFullAccess role
    this.AmazonDynamoDBFullAccess = (id = 'AmazonDynamoDBFullAccess') => {
      const role = new Role(this, id, {
        assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
        managedPolicies: [
          ManagedPolicy.fromAwsManagedPolicyName(
            'service-role/AWSLambdaBasicExecutionRole',
          ),
          ManagedPolicy.fromAwsManagedPolicyName('AmazonDynamoDBFullAccess'),
        ],
      });

      (role.node.defaultChild as CfnElement).overrideLogicalId(id);
      role.applyRemovalPolicy(RemovalPolicy.DESTROY);
      return role;
    };
    // 👇 create AmazonDynamoDBFullAccessWithSSMFullAccess role
    this.AmazonDynamoDBFullAccessWithSSMFullAccess = (
      id = 'AmazonDynamoDBFullAccessWithSSMFullAccess',
    ) => {
      const role = new Role(this, id, {
        assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
        managedPolicies: [
          ManagedPolicy.fromAwsManagedPolicyName(
            'service-role/AWSLambdaBasicExecutionRole',
          ),
          ManagedPolicy.fromAwsManagedPolicyName('AmazonDynamoDBFullAccess'),
          ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMFullAccess'),
        ],
      });

      (role.node.defaultChild as CfnElement).overrideLogicalId(id);
      role.applyRemovalPolicy(RemovalPolicy.DESTROY);
      return role;
    };
    // 👇 create AmazonS3FullAccess role
    this.AmazonS3FullAccess = (id = 'AmazonS3FullAccess') => {
      const role = new Role(this, id, {
        assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
        managedPolicies: [
          ManagedPolicy.fromAwsManagedPolicyName(
            'service-role/AWSLambdaBasicExecutionRole',
          ),
          ManagedPolicy.fromAwsManagedPolicyName('AmazonDynamoDBFullAccess'),
          ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMFullAccess'),
          ManagedPolicy.fromAwsManagedPolicyName('AmazonS3FullAccess'),
        ],
      });

      (role.node.defaultChild as CfnElement).overrideLogicalId(id);
      role.applyRemovalPolicy(RemovalPolicy.DESTROY);
      return role;
    };
    // 👇 create AmazonSSMFullAccess role
    /*
        this.AmazonSSMFullAccess = (id = 'AmazonSSMFullAccess') => {
            const role = new Role(this, id, {
                assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
                managedPolicies: [
                    ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole"),
                    ManagedPolicy.fromAwsManagedPolicyName("AmazonSSMFullAccess"),
                ],
            });

            (role.node.defaultChild as CfnElement).overrideLogicalId(id);
            role.applyRemovalPolicy(RemovalPolicy.DESTROY);
            return role;
        };
        */
  }
}
