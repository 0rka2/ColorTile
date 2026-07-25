import "server-only";

const REQUIRED_PRODUCTION_ENVIRONMENT_VARIABLES = [
  "BETTER_AUTH_SECRET",
  "DATABASE_URL",
] as const;

export function assertServerEnvironment() {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  const missingVariables = REQUIRED_PRODUCTION_ENVIRONMENT_VARIABLES.filter(
    (variableName) => !process.env[variableName]?.trim(),
  );

  if (missingVariables.length > 0) {
    throw new Error(
      `Missing required production environment variables: ${missingVariables.join(", ")}.`,
    );
  }
}
