# db-dynamo

This CloudFormation stack creates a DynamoDB table.

The SAM Resources are:

- DynamoTable AWS::DynamoDB::Table

To build and deploy this stack:

```
sam build && sam deploy --profile contactz
```

To delete this stack:

```
aws --profile contactz cloudformation delete-stack --stack-name db-dynamo-contact
```
