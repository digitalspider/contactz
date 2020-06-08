This project installs the infrastructure into an AWS application.

Specifically KMS (Cryptography), Networking, an AWS RDS Datastore

To install this run you need:
* aws cli = https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-welcome.html
* Docker
* AWS SAM CLI = https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html

To verify the above run:
!!AWS
`aws --version`
Output:
`aws-cli/1.16.243 Python/3.7.4 Windows/10 botocore/1.12.233`

!!Docker
`docker --version`
Output:
`Docker version 19.03.8, build afacb8b`

!!To Run SAM:
`sam build && sam deploy --guided`
