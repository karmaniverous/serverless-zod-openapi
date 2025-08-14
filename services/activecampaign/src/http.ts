import type { AxiosRequestConfig } from 'axios';

export const acDefaults = (): AxiosRequestConfig => {
  const server =
    process.env.AC_SERVER ??
    process.env.ACTIVE_CAMPAIGN_SERVER ??
    'youraccountname.api-us1.com';

  const baseURL =
    process.env.AC_BASE_URL ??
    process.env.ACTIVE_CAMPAIGN_BASE_URL ??
    `https://${server}/api/3`;

  const apiToken =
    process.env.AC_API_TOKEN ?? process.env.ACTIVE_CAMPAIGN_API_TOKEN ?? '';

  return {
    baseURL,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(apiToken ? { 'Api-Token': apiToken } : {}),
    },
  };
};
