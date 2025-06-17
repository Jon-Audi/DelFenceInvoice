import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {Request, Response} from "express";
import { MailerSend, Recipient, EmailParams } from "mailersend";

admin.initializeApp();

export const sessionLogin = functions.https.onRequest(
  async (req: Request, res: Response) => {
    const idToken = req.body.idToken;
    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days

    try {
      const sessionCookie = await admin.auth()
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

export const sendEmailWithMailerSend = functions.https.onCall(async (data, context) => {
  const mailersendApiKey = functions.config().mailersend?.apikey || process.env.MAILERSEND_API_KEY;
  const mailersendFromEmail = functions.config().mailersend?.fromemail || process.env.MAILERSEND_FROM_EMAIL || "noreply@yourdomain.com";
  const mailersendFromName = functions.config().mailersend?.fromname || process.env.MAILERSEND_FROM_NAME || "Delaware Fence Pro";

  if (!mailersendApiKey) {
    console.error("MailerSend API key is not configured.");
    throw new functions.https.HttpsError("internal", "Email service is not configured correctly (API key missing).");
  }

  const { to, subject, htmlBody, cc, bcc } = data;

  if (!to || !Array.isArray(to) || to.length === 0) {
    throw new functions.https.HttpsError("invalid-argument", "Recipient email(s) (to) are required as an array.");
  }
  if (!subject) {
    throw new functions.https.HttpsError("invalid-argument", "Subject is required.");
  }
  if (!htmlBody) {
    throw new functions.https.HttpsError("invalid-argument", "HTML body is required.");
  }

  const mailerSendInstance = new MailerSend({ apiKey: mailersendApiKey });

  const recipients = to.map((email: string) => new Recipient(email, "")); // Name is optional

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
    const bccRecipients = bcc.map((email: string) => new Recipient(email, ""));
    emailParams.setBcc(bccRecipients);
  }

  try {
    const response = await mailerSendInstance.email.send(emailParams);
    console.log("Email sent successfully via MailerSend:", response.headers && response.headers["x-message-id"]);
    return { success: true, message: "Email sent successfully.", messageId: response.headers && response.headers["x-message-id"] };
  } catch (error: any) {
    console.error("Error sending email via MailerSend:", error.body ? error.body.errors : error);
    const errorMessage = error.body?.message || error.message || "Failed to send email via MailerSend.";
    throw new functions.https.HttpsError("internal", `Failed to send email: ${errorMessage}`);
  }
});
