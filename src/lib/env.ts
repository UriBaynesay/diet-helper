function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  get DATABASE_URL() {
    return required("DATABASE_URL");
  },
  get CF_ACCESS_TEAM_DOMAIN() {
    return required("CF_ACCESS_TEAM_DOMAIN");
  },
  get CF_ACCESS_AUD() {
    return required("CF_ACCESS_AUD");
  },
  get CRON_SECRET() {
    return required("CRON_SECRET");
  },
  get GMAIL_USER() {
    return required("GMAIL_USER");
  },
  get GMAIL_APP_PASSWORD() {
    return required("GMAIL_APP_PASSWORD");
  },
  get APP_URL() {
    return required("APP_URL");
  },
  get ANTHROPIC_API_KEY() {
    return required("ANTHROPIC_API_KEY");
  },
  get SPOONACULAR_API_KEY() {
    return required("SPOONACULAR_API_KEY");
  },
};
