# vpc-network

This CloudFormation stack creates the networking required by the application. It exposes information via SecretsManager.

This includes:

- The VPC to be used by the application
- The SecretsManager, which contains the following secrets:
  \*\* vpc-secret - contains the VpcId, private subnets, and associated security groups

The SAM Resources are:

- EIP1 AWS::EC2::EIP
- IGW AWS::EC2::InternetGateway
- NATGateway1 AWS::EC2::NatGateway
- NATRoute1 AWS::EC2::Route
- NATRoute2 AWS::EC2::Route
- NATRoute3 AWS::EC2::Route
- NATRouteTable1 AWS::EC2::RouteTable
- NATRouteTable2 AWS::EC2::RouteTable
- NATRouteTable3 AWS::EC2::RouteTable
- RouteTable AWS::EC2::RouteTable
- Route AWS::EC2::Route
- VPCIGW AWS::EC2::VPCGatewayAttachment
- VPCPrivateSecurityGroup AWS::EC2::SecurityGroup
- VPCPublicSecurityGroup AWS::EC2::SecurityGroup
- VPCSecurityGroup AWS::EC2::SecurityGroup
- VPCSecret AWS::SecretsManager::Secret
- VPCSubnetAssocPublic1 AWS::EC2::SubnetRouteTableAssociation
- VPCSubnetAssocPublic2 AWS::EC2::SubnetRouteTableAssociation
- VPCSubnetAssocPublic3 AWS::EC2::SubnetRouteTableAssociation
- VPCSubnetAssocPrivate1 AWS::EC2::SubnetRouteTableAssociation
- VPCSubnetAssocPrivate2 AWS::EC2::SubnetRouteTableAssociation
- VPCSubnetAssocPrivate3 AWS::EC2::SubnetRouteTableAssociation
- VPCSubnetPublic1 AWS::EC2::Subnet
- VPCSubnetPublic2 AWS::EC2::Subnet
- VPCSubnetPublic3 AWS::EC2::Subnet
- VPCSubnetPrivate1 AWS::EC2::Subnet
- VPCSubnetPrivate2 AWS::EC2::Subnet
- VPCSubnetPrivate3 AWS::EC2::Subnet
- VPC AWS::EC2::VPC
- BastionSecurityGroup AWS::EC2::SecurityGroup
- Bastion AWS::EC2::Instance

To build and deploy this stack:

```
sam build && sam deploy --profile team
```

To delete this stack:

```
aws --profile team cloudformation delete-stack --stack-name vpc-network
```
