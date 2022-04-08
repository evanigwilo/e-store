import {RemovalPolicy} from 'aws-cdk-lib';
import {
  Attribute,
  AttributeType,
  BillingMode,
  ProjectionType,
  Table,
} from 'aws-cdk-lib/aws-dynamodb';
import {Construct} from 'constructs';
import {Schedule} from 'aws-cdk-lib/aws-applicationautoscaling';
import {constants} from './utils';

export class Database extends Construct {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    const createTable = (
      tableName: string,
      partitionKeyName = 'id',
      sortKey?: Attribute,
    ) => {
      const table = new Table(this, tableName, {
        tableName,
        billingMode: BillingMode.PROVISIONED,
        readCapacity: 1,
        writeCapacity: 1,
        removalPolicy: RemovalPolicy.DESTROY,
        partitionKey: {name: partitionKeyName, type: AttributeType.STRING},
        sortKey,
        pointInTimeRecovery: true,
      });
      // 👇 configure auto scaling on table
      const writeAutoScaling = table.autoScaleWriteCapacity({
        minCapacity: 1,
        maxCapacity: 2,
      });
      // 👇 scale up when write capacity hits 75%
      writeAutoScaling.scaleOnUtilization({
        targetUtilizationPercent: 75,
      });
      // 👇 scale up at 9 o'clock in the morning
      writeAutoScaling.scaleOnSchedule('scale-up', {
        schedule: Schedule.cron({hour: '9', minute: '0'}),
        minCapacity: 2,
      });

      // 👇 scale down in the afternoon
      writeAutoScaling.scaleOnSchedule('scale-down', {
        schedule: Schedule.cron({hour: '14', minute: '0'}),
        maxCapacity: 2,
      });

      return table;
    };
    const createGlobalSecondaryIndex = (
      table: Table,
      indexName: string,
      partitionKey: Attribute,
      sortKey?: Attribute,
      projectionType = ProjectionType.ALL,
    ) => {
      // 👇 add global secondary index
      table.addGlobalSecondaryIndex({
        indexName,
        partitionKey,
        sortKey,
        readCapacity: 1,
        writeCapacity: 1,
        projectionType,
      });
    };
    // 👇 create the products table
    createGlobalSecondaryIndex(
      createTable(constants.productTable),
      constants.categoryIndex,
      {name: 'category', type: AttributeType.STRING},
      {name: 'price', type: AttributeType.NUMBER},
    );
    // 👇 create the orders table
    createTable(constants.orderTable, 'user', {
      name: 'intent',
      type: AttributeType.STRING,
    });
  }
}
