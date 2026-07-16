// Storybook module mock for $lib/molecule/molecule.remote, swapped in by
// the resolveId plugin in .storybook/main.ts (sb.mock cannot follow the
// $lib alias). The real module is a SvelteKit remote-functions file:
// importing it pulls server-only code (drizzle/postgres) into the browser
// bundle, which can't compile under Storybook. MoleculeTable renders
// MoleculeFormDialog unconditionally (just closed by default), which
// imports these forms, so every story that renders the table needs this
// stand-in regardless of whether the dialog is ever opened.
//
// This mimics just enough of the `form()`/`command()` remote-function shape
// (fields proxy, preflight/enhance chain, pending/result/element, plain
// callable) for MoleculeFormDialog's unconditional top-level `$derived`s to
// run without throwing — not real submit/validation behavior.
//
// Two hard-won constraints on this file (see .storybook/main.ts):
// - it must live OUTSIDE any `__mocks__` directory (storybook's mocking
//   machinery transforms those), and
// - its filename must NOT match `*.remote.*` — SvelteKit's remote-functions
//   transform is filename-triggered and would replace the module with an
//   empty `__sveltekit/remote` shell.

function createField() {
  return {
    set: () => {},
    value: () => undefined,
    issues: () => [],
    as: () => ({}),
  };
}

function createFields() {
  return new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === 'set') return () => {};
        return createField();
      },
    },
  );
}

function createFormMock() {
  const form = Object.assign(async () => ({ success: true }), {
    pending: 0,
    result: null,
    element: null,
    fields: createFields(),
    preflight: () => form,
    enhance: () => ({}),
    for: () => createFormMock(),
  });
  return form;
}

export const listMolecules = async () => [];
export const getMoleculeFileContent = async () => ({ contents: '' });
export const uploadMolecule = createFormMock();
export const editMoleculeFile = createFormMock();
export const editMolecule = createFormMock();
export const deleteMoleculeFile = createFormMock();
export const deleteMolecule = createFormMock();
export const editMoleculeFileContents = createFormMock();
export const replaceMoleculeFile = createFormMock();
