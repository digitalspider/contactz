# api-domain

This CloudFormation stack creates the API Domain

The result URL is: https://contactz.com.au

A CertificateARN is required to create this stack

The SAM Resources are:

- ApiDomain AWS::ApiGatewayV2::DomainName
- Route53 AWS::Route53::RecordSet

To build and deploy this stack:

```
sam build && sam deploy --profile team
```

To delete this stack:

```
aws --profile team cloudformation delete-stack --stack-name api-domain
```
