import { init } from '@paralleldrive/cuid2';
import { getColumns } from 'drizzle-orm';
import {
  char,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core';

const uIdLength = 24;

const createId = init({ length: uIdLength });

const timestamps = {
  createdAt: timestamp({ mode: 'date', precision: 3 })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: timestamp({ mode: 'date', precision: 3 }).$onUpdate(
    () => new Date(),
  ),
};

const fileData = {
  filename: text('filename').notNull(),
  contents: text('contents').notNull(),
  sha: char({ length: 64 }).unique().notNull(),
};

const qRange = {
  qMin: numeric({ mode: 'number' }).notNull(),
  qMax: numeric({ mode: 'number' }).notNull(),
  qStep: numeric({ mode: 'number' }).notNull(),
};

export const moleculeFiles = pgTable('moleculeFiles', {
  id: char({ length: uIdLength })
    .primaryKey()
    .unique()
    .$defaultFn(() => createId()),

  moleculeName: text().notNull(),
  atomCount: integer().notNull(),
  description: text().notNull(),
  state: integer().notNull(),
  reference: text(),
  ...fileData,
  ...timestamps,
});

// Edits (see $lib/server/data) update `moleculeFiles` rows in place, so no
// override table/view layer is needed — this is the single source of truth.
const { contents: _m_contents, ...moleculesInfo } = getColumns(moleculeFiles);

export { moleculesInfo };

export const intensities = pgTable(
  'intensities',
  {
    moleculeId: char({ length: uIdLength })
      .references(() => moleculeFiles.id)
      .notNull(),
    ...qRange,
    q: numeric().array(),
    intensity: numeric().array(),
    ...timestamps,
  },
  (table) => ({
    pk: [table.moleculeId, table.qMin, table.qMax, table.qStep],
  }),
);

export const solvents = pgTable(
  'solvents',
  {
    id: char({ length: uIdLength })
      .primaryKey()
      .unique()
      .$defaultFn(() => createId()),
    name: text().unique().notNull(),
    rhom: numeric({ mode: 'number' }).notNull(),
    cpm: numeric({ mode: 'number' }).notNull(),
    ...fileData,
    ...timestamps,
    ...qRange,
  },
  (table) => ({
    shaUnique: unique().on(table.sha),
  }),
);

const { contents: _s_contents, ...solventsInfo } = getColumns(solvents);

export { solventsInfo };
