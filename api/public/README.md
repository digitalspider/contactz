# public-api

This CloudFormation stack creates the Contact Public API.

The SAM Resources are:

- AccessLogs AWS::Logs::LogGroup
- PublicApiStage AWS::ApiGateway::Stage
- PublicApi AWS::ApiGateway::RestApi
- ContactFunction AWS::Lambda::Function
- ContactDependenciesLayer AWS::Lambda::LayerVersion
- ContactFunctionGetContactPermissionStage AWS::Lambda::Permission
- ContactFunctionListContactPermissionStage AWS::Lambda::Permission
- ContactFunctionCreateContactPermissionStage AWS::Lambda::Permission
- ContactFunctionDeleteContactPermissionStage AWS::Lambda::Permission
- ContactFunctionUpdateContactPermissionStage AWS::Lambda::Permission
- LambdaRole AWS::IAM::Role

To build and deploy this stack:

```
sam build && sam deploy --profile contactz
```

To delete this stack:

```
aws --profile contactz cloudformation delete-stack --stack-name public-api
```
