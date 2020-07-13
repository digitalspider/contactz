# public-api

This CloudFormation stack creates the Contact Public API.

The SAM Resources are:

- AccessLogs AWS::Logs::LogGroup
- ApiMapping AWS::ApiGatewayV2::ApiMapping
- ContactDependenciesLayer AWS::Lambda::LayerVersion
- ContactFunctionGetContactPermissionStage AWS::Lambda::Permission
- ContactFunctionListContactPermissionStage AWS::Lambda::Permission
- ContactFunctionCreateContactPermissionStage AWS::Lambda::Permission
- ContactFunctionDeleteContactPermissionStage AWS::Lambda::Permission
- ContactFunctionUpdateContactPermissionStage AWS::Lambda::Permission
- ContactFunction AWS::Lambda::Function
- LambdaRole AWS::IAM::Role
- PublicApiAuthLambdaRequestAuthorizerAuthorizerPermission AWS::Lambda::Permission
- PublicApiDeployment AWS::ApiGateway::Deployment
- PublicApiStage AWS::ApiGateway::Stage
- PublicApi AWS::ApiGateway::RestApi

To build and deploy this stack:

```
sam build && sam deploy --profile contactz
```

To delete this stack:

```
aws --profile contactz cloudformation delete-stack --stack-name public-api
```
