# config-api

This CloudFormation stack configures the CloudWatchRole for Api Gateway

The SAM Resources are:
- ApiGatewayAccountConfig          AWS::ApiGateway::Account       
- CloudWatchRole                   AWS::IAM::Role                 

To build and deploy this stack:

```
sam build && sam deploy --profile contactz
```

To delete this stack:

```
aws --profile contactz cloudformation delete-stack --stack-name config-api
```
