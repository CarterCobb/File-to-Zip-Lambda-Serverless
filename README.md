# AWS S3 Lmabda Zipper

This prject contains an example for an [AWS Lambda](https://aws.amazon.com/lambda/) that is triggered on an [AWS S3](https://aws.amazon.com/s3/) bucket create event. The lambda takes the new file, converts it to a zip file and re-uploads it back to the AWS S3 bucket.

## Technology Stack

- [NodeJS](https://nodejs.org/en/)
- [Serverless](https://www.serverless.com/)
- [AWS Lambda](https://aws.amazon.com/lambda/)
- [AWS S3](https://aws.amazon.com/s3/)

## Prerequisites

- An AWS account [sign up here](https://portal.aws.amazon.com/billing/signup#/start/email)
- AWS CLI installed and configured [demo here](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-getting-started.html)
- NodeJS installed [install here](https://nodejs.org/en/download/)
- Serverless installed and configured [demo here](https://www.serverless.com/framework/docs/getting-started)

## Initial Setup

This lambda requires initial setup before you can deploy the system using Serverless. Follow these steps:

- (required) cd into the `./layer/nodejs` folder and run `npm i`
  - This is required due to it being a fundamental part of creating the Lambda Layer -> Layer for NodeJS dependencies
- (optional - used for local testing) In the root directory run `npm i`

Both those steps install the NodeJs dependencies for the project. More specifically [archiver](https://www.npmjs.com/package/archiver) & [stream](https://www.npmjs.com/package/stream).  

> Important!

(optional) If you prefer to use Environment Variables to hide your resource names:

- Create a `.env` file in the root directory
- Add variables to store each AWS S3 bucket name. e.g. `BUCKET=my-s3-bucket`
  - Do this for each bucket you wish to attach to the lambda as a trigger. Be sure to name each variable different

Some files require you to use your AWS credentials and resource names. Those are as follows:

- [`serverless.yml`](https://github.com/CarterCobb/File-to-Zip-Lambda-Serverless/blob/master/serverless.yml)
  - At the bottom of the file, there is a custom property to store bucket names
    - Add each of your buckets under the `buckets` property. format is `${env:BUCKET_NAME_ENV_VAR, 'default if no env var'}`
  - In the middle of the file you will see `functions: ...`
    - Add an event to each of your AWS S3 buckets you listed in the custom property from before. Templete in file.
  - Twards the top of the file there is an `iam` property
    - Once again list all your buckets from the custom property you defined under the `Resource` property. Templete in file.
- [`handler.js`](https://github.com/CarterCobb/File-to-Zip-Lambda-Serverless/blob/master/handler.js)
  - The only edit required is the AWS region your S3 bucket resides in.
    - At the top of the file change `const s3 = new AWS.S3({ region: "<YOUR_AWS_REGION>" });`

Other edits can be made such as the location the zip file get stored when it is uploaded to the S3 bucket. Refer to the JSDocs in [`handler.js`](https://github.com/CarterCobb/File-to-Zip-Lambda-Serverless/blob/master/handler.js) to change/edit that configuiration.

## Deploy to AWS

This is the easiest part.

- Simply run `serverless deploy` in the root directory.

Assuming AWS CLI is confiugured and no issues with credentials are found the lambda will be created and deplotyed to your account.

Things you will notice:

- The Lambda will have 1 layer. That is the NodeJS dependancies.
- The lambda will have at least one event pointing to a S3 bucket.
- You will see a CloudFormation stack that handles the upload.
- A seperate lambda will be created with a random looking name.
- A seperate AWS S3 bucket will be created that also has a random looking name.

Leave all of these things alone as they are helpers for Serverless to delpoy and re-deploy the system.

## Remove the AWS Deployment

To tear down and destroy all resources that were created

- Simply run `serverless remove` in the root directory.

## Logic Behind the Lambda

Please refer to the JSDocs in the [`handler.js`](https://github.com/CarterCobb/File-to-Zip-Lambda-Serverless/blob/master/handler.js) file.

## Additional Details

This was built to assist a fellow developer with the logic base in the Lambda function and how Serverless opperates. Thus, this project is Open Source and free to be used and copied by all.
