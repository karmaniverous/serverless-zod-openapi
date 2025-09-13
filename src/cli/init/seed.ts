import { join, posix } from 'node:path';

import { writeIfAbsent } from './fs';

export const seedRegisterPlaceholders = async (
  root: string,
): Promise<{ created: string[]; skipped: string[] }> => {
  const genDir = join(root, 'app', 'generated');
  const seeds: Array<{ path: string; content: string }> = [
    {
      path: join(genDir, 'register.functions.ts'),
      content:
        '/* AUTO-GENERATED placeholder; will be rewritten by `smoz register` */\nexport {};\n',
    },
    {
      path: join(genDir, 'register.openapi.ts'),
      content:
        '/* AUTO-GENERATED placeholder; will be rewritten by `smoz register` */\nexport {};\n',
    },
    {
      path: join(genDir, 'register.serverless.ts'),
      content:
        '/* AUTO-GENERATED placeholder; will be rewritten by `smoz register` */\nexport {};\n',
    },
  ];
  const created: string[] = [];
  const skipped: string[] = [];
  for (const s of seeds) {
    const { created: c } = await writeIfAbsent(s.path, s.content);
    (c ? created : skipped).push(posix.normalize(s.path));
  }
  return { created, skipped };
};
