
// src/functions/src/index.ts
import type {
  Request,
  Response, // Added trailing comma here
} from "express"; // Keep type for express based functions
import {initializeApp} from "firebase-admin/app";
import {getAuth} from "firebase-admin/auth";
import {MailerSend, Recipient, EmailParams} from "mailersend";
import * as functions from "firebase-functions";
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

export const sessionLogin = functions.https.onRequest(
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

export const logout = functions.https.onRequest(
  (req: Request, res: Response) => {
    res.clearCookie("session");
    res.status(200).send({status: "logged out"});
  }
);

// HTTPS Callable function for sending email
export const sendEmailWithMailerSend = functions.https.onCall(
  async (data: EmailPayload, _context: CallableContext) => {
    // _context is available here if needed, e.g., for checking auth
    // const uid = _context.auth?.uid;

    const mailersendApiKey =
      functions.config().mailersend?.apikey ||
      process.env.MAILERSEND_API_KEY;
    const mailersendFromEmail =
      functions.config().mailersend?.fromemail ||
      process.env.MAILERSEND_FROM_EMAIL ||
      "noreply@yourdomain.com"; // Fallback
    const mailersendFromName =
      functions.config().mailersend?.fromname ||
      process.env.MAILERSEND_FROM_NAME ||
      "Delaware Fence Pro"; // Fallback

    if (!mailersendApiKey) {
      console.error("MailerSend API key missing.");
      throw new functions.https.HttpsError(
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
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Recipient email(s) are required."
      );
    }
    if (!subject) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Subject is required."
      );
    }
    if (!htmlBody) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "HTML body is required."
      );
    }

    const mailerSendInstance = new MailerSend({apiKey: mailersendApiKey});

    const recipients = to.map((email: string) => new Recipient(email, ""));

    const emailParams = new EmailParams()
      .setFrom(mailersendFromEmail)
      .setFromName(mailersendFromName)
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
        // Type assertion for plain object access if necessary and known structure
        messageId = (response.headers as Record<string, string>)[messageIdHeader] || "N/A";
      }

      console.log("Email sent via MailerSend:", messageId);
      return {
        success: true,
        message: "Email sent successfully.",
        messageId,
      };
    } catch (error: unknown) { // Typed error as unknown
      let errorMessage = "Failed to send email via MailerSend.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      // MailerSend specific error handling structure
      // Check if error has a 'body' property and if that body has 'message'
      const mailerSendError = error as { body?: { message?: string, errors?: unknown } };
      if (mailerSendError.body && mailerSendError.body.message) {
        errorMessage = mailerSendError.body.message;
        console.error(
          "MailerSend API Error:",
          mailerSendError.body.errors || mailerSendError.body
        );
      } else {
        console.error("Error sending MailerSend email:", error);
      }

      const finalErrorMessage = `Failed to send email: ${errorMessage}`;
      throw new functions.https.HttpsError("internal", finalErrorMessage);
    }
  }
);
