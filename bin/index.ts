#!/usr/bin/env node
import {App} from 'aws-cdk-lib';
import {CdkStack} from '../lib';

const app = new App();
new CdkStack(app, 'cdk-stack', {
  stackName: 'cdk-stack',
  /*
  env: {
    region: process.env.CDK_DEFAULT_REGION,
    account: process.env.CDK_DEFAULT_ACCOUNT,
  },
  */
});
