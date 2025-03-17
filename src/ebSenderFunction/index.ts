import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { SES } from "aws-sdk";
import { z } from "zod";

// Get API key from environment variables
const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  throw new Error("API_KEY environment variable is not set");
}

const ses = new SES({ region: process.env.REGION });
const EmailRequestSchema = z.object({
  email: z.string().email("Invalid email format"),
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Body is required"),
});

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // Validate API key in headers
    const authHeader = event.headers?.["x-api-key"] || event.headers?.["X-Api-Key"];
    if (!authHeader || authHeader !== API_KEY) {
      return {
        statusCode: 401,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Unauthorized - Invalid or missing API key",
        }),
      };
    }

    // Parse the request body
    const requestBody = JSON.parse(event.body || "{}");

    // Validate the request using Zod
    const result = EmailRequestSchema.safeParse(requestBody);

    if (!result.success) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Validation error",
          errors: result.error.format(),
        }),
      };
    }

    // Extract validated email parameters
    const { email, subject, body } = result.data;

    // Prepare email parameters
    const params: SES.SendEmailRequest = {
      Destination: {
        ToAddresses: [email],
      },
      Message: {
        Body: {
          Text: {
            Data: body,
          },
        },
        Subject: {
          Data: subject,
        },
      },
      Source: process.env.SOURCE_EMAIL || "no-reply@encompassblue.com",
    };

    // Send email
    await ses.sendEmail(params).promise();

    // Return success response
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Email sent successfully",
      }),
    };
  } catch (error) {
    console.error("Error sending email:", error);

    // Return error response
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Failed to send email",
        error: error instanceof Error ? error.message : "Unknown error",
      }),
    };
  }
};
