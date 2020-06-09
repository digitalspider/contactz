# api-domain

This CloudFormation stack creates the API Domain

The result URL is: https://contactz.com.au

Parameters:
* HostedZoneId = required for the Route53 set up
* CertificateARN = required for the ApiGateway Domain Name configuration

The SAM Resources are:

- ApiDomain AWS::ApiGatewayV2::DomainName
- Route53 AWS::Route53::RecordSet

To build and deploy this stack:

```
sam build && sam deploy --profile contactz
```

To delete this stack:

```
aws --profile contactz cloudformation delete-stack --stack-name api-domain
```
