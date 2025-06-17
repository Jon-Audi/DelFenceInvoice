
// src/functions/src/index.ts
import type {
  Request,
  Response,
} from "express"; // Keep type for express based functions
import {initializeApp} from "firebase-admin/app";
import {getAuth} from "firebase-admin/auth";
import {MailerSend, Recipient, EmailParams} from "mailersend";
// Import https from v1 for onCall functions
import {https as httpsV1} from "firebase-functions/v1";
// Import CallableContext specifically for v1 HTTPS functions
import type {CallableContext} from "firebase-functions/v1/https";

initializeApp();

interface EmailPayload {
  to: string[];
  subject: string;
  htmlBody: string;
  cc?: string[];
  bcc?: string[];
}

export const sessionLogin = httpsV1.onRequest(
  async (req: Request, res: Response) => {
    const idToken = req.body.idToken;
    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days

    try {
      const sessionCookie = await getAuth()
        .createSessionCookie(idToken, {expiresIn});
      const options = {maxAge: expiresIn, httpOnly: true, secure: true};

      res.cookie("session", sessionCookie, options);
      res.status(200).send({status: "success"});
    } catch (error) {
      res.status(401).send("UNAUTHORIZED");
    }
  }
);

export const logout = httpsV1.onRequest(
  (req: Request, res: Response) => {
    res.clearCookie("session");
    res.status(200).send({status: "logged out"});
  }
);

// HTTPS Callable function for sending email
export const sendEmailWithMailerSend = httpsV1.onCall(
  async (data: EmailPayload, _context: CallableContext) => {
    const mailersendApiKey =
      process.env.MAILERSEND_API_KEY ||
      httpsV1.config().mailersend?.apikey; // Use httpsV1.config()
    const mailersendFromEmail =
      process.env.MAILERSEND_FROM_EMAIL ||
      httpsV1.config().mailersend?.fromemail || // Use httpsV1.config()
      "noreply@yourdomain.com"; // Fallback
    const mailersendFromName =
      process.env.MAILERSEND_FROM_NAME ||
      httpsV1.config().mailersend?.fromname || // Use httpsV1.config()
      "Delaware Fence Pro"; // Fallback

    if (!mailersendApiKey) {
      console.error("MailerSend API key missing.");
      throw new httpsV1.HttpsError(
        "internal",
        "Email service not configured (API key)."
      );
    }

    const {
      to,
      subject,
      htmlBody,
      cc,
      bcc,
    } = data;

    if (!to || !Array.isArray(to) || to.length === 0) {
      throw new httpsV1.HttpsError(
        "invalid-argument",
        "Recipient email(s) are required."
      );
    }
    if (!subject) {
      throw new httpsV1.HttpsError(
        "invalid-argument",
        "Subject is required."
      );
    }
    if (!htmlBody) {
      throw new httpsV1.HttpsError(
        "invalid-argument",
        "HTML body is required."
      );
    }

    const mailerSendInstance = new MailerSend({apiKey: mailersendApiKey});

    const recipients = to.map((email: string) => new Recipient(email, ""));

    const emailParams = new EmailParams()
      .setFrom({email: mailersendFromEmail, name: mailersendFromName})
      .setRecipients(recipients)
      .setSubject(subject)
      .setHtml(htmlBody);

    if (cc && Array.isArray(cc) && cc.length > 0) {
      const ccRecipients = cc.map((email: string) => new Recipient(email, ""));
      emailParams.setCc(ccRecipients);
    }

    if (bcc && Array.isArray(bcc) && bcc.length > 0) {
      const bccRecipient = bcc.map((email: string) => new Recipient(email, ""));
      emailParams.setBcc(bccRecipient);
    }

    try {
      const response = await mailerSendInstance.email.send(emailParams);
      const messageIdHeader = "x-message-id";
      let messageId = "N/A";

      // MailerSend response.headers might not be a simple object.
      // It can be an instance of Headers or a plain object.
      if (response.headers && typeof response.headers.get === "function") {
        // Likely a Headers object
        messageId = response.headers.get(messageIdHeader) || "N/A";
      } else if (response.headers && response.headers[messageIdHeader]) {
        // Plain object access
        const headers = response.headers as Record<string, string>;
        messageId = headers[messageIdHeader] || "N/A";
      }

      console.log("Email sent, ID:", messageId);
      return {
        success: true,
        message: "Email sent successfully.",
        messageId,
      };
    } catch (error: unknown) {
      let errorMessage = "Email send failed via MailerSend.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      // Type assertion for MailerSend specific error structure
      const mailerSendError = error as {
        body?: { message?: string, errors?: unknown }
      };

      if (mailerSendError.body && mailerSendError.body.message) {
        errorMessage = mailerSendError.body.message;
        const errorDetails =
          mailerSendError.body.errors || mailerSendError.body;
        console.error("MailerSend API Error:", errorDetails);
      } else {
        console.error("Unknown Send Error:", error);
      }

      const prefix = "Email dispatch error: ";
      // Ensure truncatedMsg + prefix is well within limits
      const maxLen = 60 - prefix.length;
      const truncatedMsg = errorMessage.substring(0, maxLen) +
        (errorMessage.length > maxLen ? "..." : "");
      const finalErrorMessage = `${prefix}${truncatedMsg}`;

      throw new httpsV1.HttpsError("internal", finalErrorMessage);
    }
  }
);
