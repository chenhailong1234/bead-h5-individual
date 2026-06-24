import type { NextFunction, Request, Response } from "express";
import session from "express-session";
import { env } from "../config/env";
import { store } from "../store";

declare module "express-session" {
  interface SessionData {
    userId?: string;
  }
}

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        openid: string;
        regularCount: number;
        memberCount: number;
      };
    }
  }
}

export function sessionMiddleware() {
  return session({
    name: "bead.sid",
    secret: env.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: 1000 * 60 * 60 * 24 * 30
    }
  });
}

export async function attachUser(req: Request, _res: Response, next: NextFunction) {
  if (!req.session.userId) {
    next();
    return;
  }

  const user = store.users.get(req.session.userId);
  if (user) {
    req.user = {
      id: user.id,
      openid: user.openid,
      regularCount: user.regularCount,
      memberCount: user.memberCount
    };
  }
  next();
}

export function requireUser(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({ code: "UNAUTHORIZED", message: "请先登录" });
    return;
  }
  next();
}
