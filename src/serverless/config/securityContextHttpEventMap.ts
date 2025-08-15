import type { SecurityContextHttpEventMap } from '@/src/types/SecurityContextHttpEventMap';

export const securityContextHttpEventMap: SecurityContextHttpEventMap = {
  my: {
    authorizer: {
      arn: '${param:COGNITO_USER_POOL_ARN}',
      name: 'UserPoolAuthorizer',
      type: 'COGNITO_USER_POOLS',
    },
  },
  private: { private: true },
  public: {},
};
