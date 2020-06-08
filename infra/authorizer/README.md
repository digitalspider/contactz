# authorizer-lambda

This CloudFormation stack provides an Authorizer lambda.

This requires the KMS shared secret

The SAM Resources are:

- AuthSecret AWS::SecretsManager::Secret
- AuthDependenciesLayer AWS::Lambda::LayerVersion
- AuthFunction AWS::Lambda::Function
- DecryptDbConfigWithKey AWS::IAM::Role

To build and deploy this stack:

```
sam build && sam deploy --parameter-overrides JwtSecret=abc
```

To delete this stack:

```
aws --profile contactz cloudformation delete-stack --stack-name authorizer-lambda
```
