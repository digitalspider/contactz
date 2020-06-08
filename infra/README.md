This project installs the infrastructure into an AWS application.

Specifically VPC Networking, Domain Name, Lambda Authorizer and an AWS RDS Datastore

To install this run you need:

- aws cli = https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-welcome.html
- Docker
- AWS SAM CLI = https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html

To verify the above run:

## AWS

`aws --version`
Output:
`aws-cli/1.16.243 Python/3.7.4 Windows/10 botocore/1.12.233`

Make sure that the following profile exists in the file `~/.aws/credentials`

```
[contactz]
aws_access_key_id = A...
aws_secret_access_key = D...
```

## Docker

`docker --version`
Output:
`Docker version 19.03.8, build afacb8b`

## SAM:

`sam --version`
Output:
`SAM CLI, version 0.42.0`

## Create an S3 Bucket for SAM

Run:
`aws --profile contactz s3api create-bucket --bucket sam-contactz --region ap-southeast-2 --create-bucket-configuration LocationConstraint=ap-southeast-2`
