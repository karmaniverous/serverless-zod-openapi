import type { APIGatewayProxyEvent } from 'aws-lambda';
import { get, lowerize } from 'radash';

export const isMultipart = (event: APIGatewayProxyEvent): boolean => {
  const headers = lowerize(event.headers); // normalize keys
  const ct = get(headers, 'content-type');

  return (
    typeof ct === 'string' &&
    ct.startsWith('multipart/form-data') &&
    ct.includes('boundary=')
  );
};
