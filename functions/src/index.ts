
// src/functions/src/index.ts
import type {
  Request,
  Response,
} from "express"; // Keep type for express based functions
import {initializeApp} from "firebase-admin/app";
import {getAuth} from "firebase-admin/auth";
// Import https from v1 for onCall functions
import {https as httpsV1} from "firebase-functions/v1";
// Import CallableContext specifically for v1 HTTPS functions
// import type {CallableContext} from "firebase-functions/v1/https"; // Removed

initializeApp();

// Removed EmailPayload interface as it's no longer used

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

// sendEmailWithMailerSend function removed.
// Email sending is now handled by the Trigger Email Firebase Extension.
// Client-side code writes to Firestore to trigger the extension.
// The 'emails' collection is monitored by the extension.
