# db-rds

This CloudFormation stack creates the PostgreSQL Database.

The SAM Resources are:

- DBInstance AWS::RDS::DBInstance
- DBSecret AWS::SecretsManager::Secret
- DBSecurityGroup AWS::EC2::SecurityGroup
- DBSubnetGroup AWS::RDS::DBSubnetGroup
- RDSEncryptionKeyAlias AWS::KMS::Alias
- RDSEncryptionKey AWS::KMS::Key

To build and deploy this stack:

```
sam build && sam deploy --profile contactz
```

To delete this stack:

```
aws --profile contactz cloudformation delete-stack --stack-name db-rds
```
