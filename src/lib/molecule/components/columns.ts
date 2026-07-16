import type { Molecule } from '../types';
import { createColumnHelper } from '@tanstack/table-core';

import { renderComponent } from '$lib/shadcn/components/ui/data-table';

import HeaderButton from './ui/TableHeaderButton.svelte';
import * as Cells from './ui/cells';

// Row type that includes both group rows and molecule rows
export type TableRow = GroupRow | MoleculeRow;

export type GroupRow = {
  moleculeName: string;
  atomCount: number;
  molecules: MoleculeRow[];
  // Mark this as a group row by omitting molecule-specific fields
  id?: never;
  filename?: never;
};

export type MoleculeRow = Molecule & {
  molecules?: never; // Molecule rows don't have subrows
};

// Molecule ground/excited selection, injected from the composing page so the
// cells never reach into the app-level simulation context.
export type MoleculeSelection = {
  groundId: string | null;
  excitedId: string | null;
  toggleGround: (molecule: Molecule) => void;
  toggleExcited: (molecule: Molecule) => void;
  selectGroup: (molecules: Molecule[]) => void;
};

// Edit entry points, injected from the table so the cells only signal intent;
// the table owns the shared edit/upload dialog (MoleculeFormDialog).
export type MoleculeTableEditing = {
  enabled: boolean;
  onEditMolecule: (group: GroupRow) => void;
  onAddFile: (moleculeName: string) => void;
  onEditFile: (molecule: MoleculeRow) => void;
};

export type MoleculeTableHandlers = {
  selection: MoleculeSelection;
  editing: MoleculeTableEditing;
};

const columnHelper = createColumnHelper<TableRow>();

// Declarative column list: one accessor per table column; splitting it up
// would only scatter the table's shape across helpers.
// eslint-disable-next-line max-lines-per-function
export function createMoleculeColumns(handlers: MoleculeTableHandlers) {
  return [
    // Molecule name / selection column
    columnHelper.accessor('moleculeName', {
      header: ({ column }) =>
        renderComponent(HeaderButton, {
          variant: 'ghost',
          size: 'sm',
          column: column,
          text: 'Molecule',
          onclick: () => column.toggleSorting(column.getIsSorted() === 'asc'),
        }),
      cell: ({ row }) => {
        if (row.depth === 0) {
          // Group header - show molecule name plus atoms/file-count meta
          return renderComponent(Cells.MoleculeTitle, {
            group: row.original as GroupRow,
            selection: handlers.selection,
          });
        }

        return renderComponent(Cells.Selection, {
          molecule: row.original as MoleculeRow,
          selection: handlers.selection,
        });
      },
    }),

    // Filename column
    columnHelper.accessor('filename', {
      header: 'Filename',
      cell: ({ row }) => {
        if (row.depth === 0) return '';
        return renderComponent(Cells.Text, {
          text: (row.original as MoleculeRow).filename,
          class: 'font-mono text-xs',
        });
      },
    }),

    // State column
    columnHelper.accessor('state', {
      header: 'State',
      cell: ({ row, getValue }) => {
        if (row.depth === 0) return '';
        return renderComponent(Cells.StateBadge, {
          state: getValue() as number,
        });
      },
    }),

    // Description column — wraps to any length (see the cell class override
    // in MoleculeTable.svelte)
    columnHelper.accessor('description', {
      header: 'Description',
      cell: ({ row }) => {
        if (row.depth === 0) return '';
        return renderComponent(Cells.Text, {
          text: (row.original as MoleculeRow).description,
        });
      },
    }),

    // Reference column
    columnHelper.accessor('reference', {
      header: 'Reference',
      cell: ({ row }) => {
        if (row.depth === 0) return '';
        return renderComponent(Cells.Reference, {
          value: (row.original as MoleculeRow).reference,
        });
      },
    }),

    // Edit column — group rows get "Edit molecule" / "+ file", file rows get
    // a per-row edit button; both open the shared dialog.
    columnHelper.display({
      id: 'edit',
      header: 'Edit',
      enableHiding: false,
      cell: ({ row }) => {
        if (row.depth === 0) {
          return renderComponent(Cells.Actions, {
            editing: handlers.editing,
            group: row.original as GroupRow,
          });
        }
        return renderComponent(Cells.Actions, {
          editing: handlers.editing,
          molecule: row.original as MoleculeRow,
        });
      },
    }),

    // Hidden columns
    columnHelper.accessor('atomCount', {
      header: ({ column }) =>
        renderComponent(HeaderButton, {
          variant: 'ghost',
          size: 'sm',
          column: column,
          text: 'Atoms',
          onclick: () => column.toggleSorting(column.getIsSorted() === 'asc'),
        }),
      cell: ({ row, getValue }) => {
        if (row.depth === 0) return '';
        return renderComponent(Cells.Text, {
          text: getValue(),
        });
      },
    }),

    columnHelper.accessor('id', {
      header: 'ID',
      cell: ({ row, getValue }) => {
        if (row.depth === 0) return '';
        return renderComponent(Cells.Text, {
          text: getValue() ?? null,
          class: 'text-xs text-muted-foreground font-mono',
        });
      },
    }),

    columnHelper.accessor('sha', {
      header: 'SHA',
      cell: ({ row, getValue }) => {
        if (row.depth === 0) return '';
        return renderComponent(Cells.SHA, {
          sha: getValue() as string,
        });
      },
    }),

    columnHelper.accessor('createdAt', {
      header: 'Created',
      cell: ({ row, getValue }) => {
        if (row.depth === 0) return '';
        return renderComponent(Cells.Date, {
          date: getValue() as string,
        });
      },
    }),

    columnHelper.accessor('updatedAt', {
      header: 'Updated',
      cell: ({ row, getValue }) => {
        if (row.depth === 0) return '';
        return renderComponent(Cells.Date, {
          date: getValue() as string,
        });
      },
    }),
  ];
}
