import type { AxiosRequestConfig } from '@karmaniverous/cached-axios';

export const acDefaults = (): AxiosRequestConfig => {
  const env = process.env as Record<string, string | undefined>;

  const server =
    env.AC_SERVER ??
    env.ACTIVE_CAMPAIGN_SERVER ??
    'youraccountname.api-us1.com';

  const baseURL =
    env.AC_BASE_URL ??
    env.ACTIVE_CAMPAIGN_BASE_URL ??
    `https://${server}/api/3`;

  const apiToken = env.AC_API_TOKEN ?? env.ACTIVE_CAMPAIGN_API_TOKEN;

  return {
    baseURL,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(apiToken ? { 'Api-Token': apiToken } : {}),
    },
  };
};
