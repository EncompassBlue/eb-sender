import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as path from "path";
import { SesConstruct } from "./ses-construct";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as dotenv from "dotenv";
dotenv.config();

export class EbSenderStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Get the environment
    const env = process.env.ENV || "dev";
    const domain = process.env.DOMAIN_IDENTITY || "encompassblue.com";
    const api_key = process.env.API_KEY || "superprivatekey";
    const sender = process.env.SOURCE_EMAIL || "no-reply@encompassblue.com";

    // Create SES construct
    const sesConstruct = new SesConstruct(this, "EmailSender", {
      env: env,
      domain,
    });

    // Define the Lambda function
    const emailSenderFunction = new NodejsFunction(this, "EmailSenderFunction", {
      functionName: `EmailSenderFunction-${env}`,
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: cdk.Duration.seconds(30),
      memorySize: 128,
      entry: path.join(__dirname, "../src/ebSenderFunction/index.ts"),
      environment: {
        SOURCE_EMAIL: sender,
        API_KEY: api_key,
      },
    });

    // Grant SES permissions to the Lambda function
    sesConstruct.grantSendEmail(emailSenderFunction);

    // Create API Gateway with API key
    const api = new apigateway.RestApi(this, "EmailSenderApi", {
      restApiName: "Email Sender Service",
      description: "This service sends emails via SES",
      deploy: true,
      deployOptions: {
        stageName: env,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
      apiKeySourceType: apigateway.ApiKeySourceType.HEADER,
    });

    // Create API key
    const emailResource = api.root.addResource("send-email");
    emailResource.addMethod("POST", new apigateway.LambdaIntegration(emailSenderFunction));

    // Output the API URL
    new cdk.CfnOutput(this, "ApiUrl", {
      value: `${api.url}send-email`,
      description: "URL for sending emails",
    });
  }
}
