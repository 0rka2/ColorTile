import "server-only";

import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { Pool } from "pg";

import { sanitizePlayerName } from "../game/player-progress";
import { sendAuthEmail } from "./auth-email";

const globalForAuth = globalThis as typeof globalThis & {
  colorTileAuthPool?: Pool;
};

function getAuthPool() {
  if (globalForAuth.colorTileAuthPool) {
    return globalForAuth.colorTileAuthPool;
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  if (process.env.NODE_ENV !== "production") {
    globalForAuth.colorTileAuthPool = pool;
  }

  return pool;
}

export const auth = betterAuth({
  appName: "ColorTile",
  baseURL: process.env.BETTER_AUTH_URL,
  database: getAuthPool(),
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const name = sanitizePlayerName(user.name);

          if (!name) {
            throw new APIError("BAD_REQUEST", {
              message: "Player name is required.",
            });
          }

          return {
            data: {
              ...user,
              name,
            },
          };
        },
      },
      update: {
        before: async (user) => {
          if (typeof user.name !== "string") {
            return { data: user };
          }

          const name = sanitizePlayerName(user.name);

          if (!name) {
            throw new APIError("BAD_REQUEST", {
              message: "Player name is required.",
            });
          }

          return {
            data: {
              ...user,
              name,
            },
          };
        },
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    requireEmailVerification: true,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await sendAuthEmail({
        to: user.email,
        subject: "Reset your ColorTile password",
        text: `Reset your ColorTile password using this link:\n\n${url}\n\nIf you did not request this, you can ignore this email.`,
      });
    },
  },
  emailVerification: {
    autoSignInAfterVerification: true,
    sendOnSignIn: true,
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendAuthEmail({
        to: user.email,
        subject: "Verify your ColorTile account",
        text: `Verify your ColorTile account using this link:\n\n${url}\n\nIf you did not create this account, you can ignore this email.`,
      });
    },
  },
  secret: process.env.BETTER_AUTH_SECRET,
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
});
