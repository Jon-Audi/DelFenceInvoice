import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {Request, Response} from "express";

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
