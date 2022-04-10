import {
  Bucket,
  BucketEncryption,
  HttpMethods,
  StorageClass,
} from 'aws-cdk-lib/aws-s3';
import {RemovalPolicy, Duration} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {origins, S3Constants} from './utils';

export class S3 extends Construct {
  public readonly productBucket: Bucket;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    const {productImages} = S3Constants;

    // 👇 create the bucket for images
    this.productBucket = new Bucket(this, productImages, {
      bucketName: productImages,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      versioned: false,
      publicReadAccess: false,
      encryption: BucketEncryption.S3_MANAGED,
      cors: [
        {
          allowedMethods: [HttpMethods.GET, HttpMethods.POST, HttpMethods.PUT],
          allowedOrigins: origins,
          allowedHeaders: ['*'],
        },
      ],
      lifecycleRules: [
        {
          abortIncompleteMultipartUploadAfter: Duration.days(90),
          // expiration: Duration.days(365),
          transitions: [
            {
              storageClass: StorageClass.INFREQUENT_ACCESS,
              transitionAfter: Duration.days(30),
            },
          ],
        },
      ],
    });
  }
}
