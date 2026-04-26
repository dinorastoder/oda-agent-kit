import {
  ODA_EMAIL_ENV_VAR,
  ODA_PASSWORD_ENV_VAR,
  readEnvironmentCredentials,
} from '../credentials';

describe('readEnvironmentCredentials', () => {
  it('returns trimmed credentials from the provided environment', () => {
    expect(
      readEnvironmentCredentials({
        [ODA_EMAIL_ENV_VAR]: ' shopper@example.com ',
        [ODA_PASSWORD_ENV_VAR]: ' secret-password ',
      }),
    ).toEqual({
      email: 'shopper@example.com',
      password: 'secret-password',
    });
  });

  it('throws when the email variable is missing', () => {
    expect(() =>
      readEnvironmentCredentials({
        [ODA_PASSWORD_ENV_VAR]: 'secret-password',
      }),
    ).toThrow(/Set both ODA_EMAIL and ODA_PASSWORD in the environment before launching OpenClaw/);
  });

  it('throws when credentials are blank after trimming', () => {
    expect(() =>
      readEnvironmentCredentials({
        [ODA_EMAIL_ENV_VAR]: '   ',
        [ODA_PASSWORD_ENV_VAR]: '\n',
      }),
    ).toThrow(/Set both ODA_EMAIL and ODA_PASSWORD in the environment before launching OpenClaw/);
  });
});
