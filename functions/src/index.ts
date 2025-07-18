
import { onRequest } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import type { Request, Response } from "express";

initializeApp();

export const sessionLogin = onRequest(
  { cors: true },
  async (req: Request, res: Response) => {
    const idToken = req.body.idToken;
    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days

    try {
      const sessionCookie = await getAuth().createSessionCookie(idToken, {
        expiresIn,
      });
      const options = { maxAge: expiresIn, httpOnly: true, secure: true };

      res.cookie("session", sessionCookie, options);
      res.status(200).send({ status: "success" });
    } catch (error) {
      res.status(401).send("UNAUTHORIZED");
    }
  }
);

export const logout = onRequest(
  { cors: true },
  (req: Request, res: Response) => {
    res.clearCookie("session");
    res.status(200).send({ status: "logged out" });
  }
);
