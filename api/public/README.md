# authorizer-lambda

This CloudFormation stack provides a lambda.

This requires the KMS shared secret

The SAM Resources are:

- MainDependenciesLayer AWS::Lambda::LayerVersion
- MainFunction AWS::Lambda::Function
- MainLambdaRole AWS::IAM::Role

To build and deploy this stack:

```
sam build && sam deploy --profile contactz --parameter-overrides JwtSecret=abc
```

To delete this stack:

```
aws --profile contactz cloudformation delete-stack --stack-name contact-lambda
```
