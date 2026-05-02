export interface PluginCredentials {
  email: string;
  password: string;
}

export const ODA_EMAIL_ENV_VAR = 'ODA_EMAIL';
export const ODA_PASSWORD_ENV_VAR = 'ODA_PASSWORD';

function readEnvironmentValue(env: NodeJS.ProcessEnv, name: string): string {
  const value = env?.[name];
  return typeof value === 'string' ? value.trim() : '';
}

export function readEnvironmentCredentials(env: NodeJS.ProcessEnv = process.env): PluginCredentials {
  // Guard against null/undefined passed at runtime (e.g. from untyped JS callers).
  const safeEnv: NodeJS.ProcessEnv = env ?? {};
  const email = readEnvironmentValue(safeEnv, ODA_EMAIL_ENV_VAR);
  const password = readEnvironmentValue(safeEnv, ODA_PASSWORD_ENV_VAR);

  if (!email || !password) {
    throw new Error(
      'Oda credentials are required before using this plugin. ' +
        `Set both ${ODA_EMAIL_ENV_VAR} and ${ODA_PASSWORD_ENV_VAR} in the environment before launching OpenClaw.`,
    );
  }

  return { email, password };
}
