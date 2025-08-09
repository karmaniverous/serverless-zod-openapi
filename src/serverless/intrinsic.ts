export const Arn = (resource: string) => ({ 'Fn::GetAtt': [resource, 'Arn'] });

export const IndexArn = (tableEnv: string, indexEnv: string) => ({
  'Fn::Sub': `arn:aws:dynamodb:\${param:REGION}:\${AWS::AccountId}:table/\${param:${tableEnv}}/index/\${param:${indexEnv}}`,
});

export const StateMachineArn = (stateMachineNameEnv: string) => ({
  'Fn::Sub': `arn:aws:states:\${AWS::Region}:\${AWS::AccountId}:stateMachine:\${param:${stateMachineNameEnv}}`,
});

export const ResourceName = (name: string) =>
  `\${self:service}-\${opt:stage, "dev"}-${name}`;

export const Ref = (ref: string) => ({ Ref: ref });
