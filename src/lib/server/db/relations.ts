import { defineRelations } from 'drizzle-orm';

import * as schema from './schema.ts';

export const relations = defineRelations(schema, (r) => ({
  moleculeFiles: {
    intensities: r.many.intensities(),
  },
  intensities: {
    molecule: r.one.moleculeFiles({
      from: r.intensities.moleculeId,
      to: r.moleculeFiles.id,
    }),
  },
}));
