import {CfnElement, RemovalPolicy, Stack} from 'aws-cdk-lib';
import {
  Effect,
  PolicyDocument,
  PolicyStatement,
  Role,
  WebIdentityPrincipal,
} from 'aws-cdk-lib/aws-iam';
import {Construct} from 'constructs';
import {
  CfnIdentityPool,
  CfnIdentityPoolRoleAttachment,
  UserPool,
  CfnUserPoolGroup,
  IUserPoolClient,
} from 'aws-cdk-lib/aws-cognito';
import {KeyValue, constants} from './utils';

interface UserGroupsProps {
  userPool: UserPool;
  userPoolClient: IUserPoolClient;
  amazonCognitoPowerUser: Role;
}

export class UserGroups extends Construct {
  public readonly identityPools: KeyValue = {};

  constructor(scope: Construct, id: string, UserGroupsProps: UserGroupsProps) {
    super(scope, id);

    const {userPool, userPoolClient, amazonCognitoPowerUser} = UserGroupsProps;

    const tokenMap = (identityPool: CfnIdentityPool) => {
      new CfnIdentityPoolRoleAttachment(
        this,
        `${identityPool.identityPoolName!}_attachment`,
        {
          identityPoolId: identityPool.ref,
          roles: {
            authenticated: amazonCognitoPowerUser.roleArn,
            unauthenticated: amazonCognitoPowerUser.roleArn,
          },
          roleMappings: {
            mapping: {
              type: 'Token',
              ambiguousRoleResolution: 'Deny',
              identityProvider: `${userPool.userPoolProviderName}:${userPoolClient.userPoolClientId}`,
            },
          },
        },
      );
    };
    const createIdentityPool = (identityPoolName: string) => {
      const identityPool = new CfnIdentityPool(this, identityPoolName, {
        identityPoolName,
        allowUnauthenticatedIdentities: false,
        cognitoIdentityProviders: [
          {
            clientId: userPoolClient.userPoolClientId,
            providerName: userPool.userPoolProviderName,
          },
        ],
      });
      identityPool.applyRemovalPolicy(RemovalPolicy.DESTROY);
      this.identityPools[identityPoolName] = identityPool.ref;
      tokenMap(identityPool);
      return identityPool;
    };
    const createRoleWithPolicy = (
      roleName: string,
      newLogicalId: string,
      inlinePolicies: KeyValue<PolicyDocument>,
      identityPool: CfnIdentityPool,
    ) => {
      const role = new Role(this, roleName, {
        assumedBy: new WebIdentityPrincipal('cognito-identity.amazonaws.com', {
          StringEquals: {
            'cognito-identity.amazonaws.com:aud': identityPool.ref,
          },
        }),
        inlinePolicies,
      });

      (role.node.defaultChild as CfnElement).overrideLogicalId(newLogicalId);
      role.applyRemovalPolicy(RemovalPolicy.DESTROY);
      return role;
    };
    const createGroupWithRole = (
      groupName: string,
      roleArn?: string,
      description?: string,
    ) => {
      const group = new CfnUserPoolGroup(this, groupName, {
        userPoolId: userPool.userPoolId,
        groupName,
        description,
        roleArn,
      });
      group.applyRemovalPolicy(RemovalPolicy.DESTROY);
    };
    /*
    const createGroupWithIdentity = (
      groupName: string,
      roleNewLogicalId: string,
      inlinePolicies: KeyValue<PolicyDocument>,
      description?: string,
    ) => {
      const identityPool = createIdentityPool(groupName + '_pool');
      const roleWithPolicy = createRoleWithPolicy(
        groupName + '_role',
        roleNewLogicalId + 'Role',
        inlinePolicies,
        identityPool,
      );
      createGroupWithRole(
        groupName + '_group',
        roleWithPolicy.roleArn,
        description,
      );
    };
*/
    const {
      productTable,
      groups: {admin, product},
    } = constants;
    // 👇 Admin Group
    createGroupWithRole(admin, undefined, 'For Admins');

    // 👇 Manage Products Group
    const manageProductPolicy = new PolicyDocument({
      statements: [
        new PolicyStatement({
          resources: [
            `"arn:aws:dynamodb:${Stack.of(this).region}:${
              Stack.of(this).account
            }:table/${productTable}"`,
          ],
          actions: ['dynamodb:PutItem', 'dynamodb:DeleteItem'],
          // 👇 Default for `effect` is ALLOW
          effect: Effect.ALLOW,
          conditions: {
            'ForAllValues:StringEquals': {
              'dynamodb:LeadingKeys': ['${cognito-identity.amazonaws.com:sub}'],
            },
          },
        }),
      ],
    });
    const {roleArn} = createRoleWithPolicy(
      `${product}_role`,
      'manageProductRole',
      {manageProductPolicy},
      createIdentityPool(`${product}_pool`),
    );

    createGroupWithRole(product, roleArn, 'For Managing Products');
  }
}
