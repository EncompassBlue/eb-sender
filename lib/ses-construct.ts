import * as ses from "aws-cdk-lib/aws-ses";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";

export interface SesConstructProps {
  env: string;
  domain: string;
}

export class SesConstruct extends Construct {
  public readonly ses: ses.IEmailIdentity;

  constructor(scope: Construct, id: string, props: SesConstructProps) {
    super(scope, id);

    this.ses = ses.EmailIdentity.fromEmailIdentityName(this, "ExistingIdentity", props.domain);
  }

  public grantSendEmail(lambdaFunction: lambda.Function) {
    this.ses.grantSendEmail(lambdaFunction);
  }
}
