<script lang="ts">
  // Reads + non-form mutations go through the facade so local (IndexedDB) and
  // node/static (remote) resolve at build time. The form() objects above stay
  // on molecule.remote: their field/validation machinery is client-side, and in
  // local mode only the submit action is swapped (see the enhance callbacks).
  import {
    clientWrites,
    deleteMolecule,
    deleteMoleculeFile,
    editMoleculeFileContents,
    getMoleculeFileContent,
  } from '../molecule-source.svelte';
  import type { MoleculeDialogIntent } from '../types';

  import * as Button from '$shadcn/ui/button/index.js';
  import { buttonVariants } from '$shadcn/ui/button/index.js';
  import * as Dialog from '$shadcn/ui/dialog/index.js';
  import * as Field from '$shadcn/ui/field/index.js';
  import { Input } from '$shadcn/ui/input/index.js';
  import Spinner from '$shadcn/ui/spinner/spinner.svelte';
  import * as Textarea from '$shadcn/ui/textarea/index.js';

  import {
    editMolecule,
    editMoleculeFile,
    replaceMoleculeFile,
    uploadMolecule,
  } from '$lib/molecule/molecule.remote';
  import {
    editMoleculeFileSchema,
    editMoleculeSchema,
    replaceMoleculeFileSchema,
    uploadMoleculeSchema,
  } from '$lib/shared/api/validation';
  import {
    MAX_UPLOAD_ATOM_COUNT,
    MAX_UPLOAD_FILE_BYTES,
    SOFT_ATOM_CAP,
  } from '$lib/shared/contracts';
  import type { MoleculeInfo } from '$lib/shared/contracts';
  import { useClientStorage } from '$lib/shared/storage-mode';
  import { settings } from '$lib/widgets/settings';

  interface Props {
    open?: boolean;
    intent: MoleculeDialogIntent;
    // Read-only, used only for the name-conflict preflight checks; the
    // molecule list itself refreshes via the forms' single-flight
    // `listMolecules` refresh (see molecule.remote.ts).
    molecules?: MoleculeInfo[];
  }

  let { open = $bindable(false), intent, molecules }: Props = $props();

  let submitError = $state<string | null>(null);
  // Drives the busy state for local (IndexedDB) submits, which don't go through
  // the form's server `.pending`.
  let localSubmitting = $state(false);
  // Errors from reading/parsing the selected file (schema covers the rest).
  let fileError = $state<string | null>(null);
  // Non-blocking soft-cap notice: large structures are allowed but the
  // client-side kernel will be slow (SOFT_ATOM_CAP). Distinct from fileError so
  // it warns without blocking submit — the user continues by clicking upload.
  let fileWarning = $state<string | null>(null);
  let fileReadToken = 0;
  let file = $state<File | null>(null);

  // Delete flow (edit modes): a nested confirm dialog guards the command.
  let confirmDeleteOpen = $state(false);
  let deleting = $state(false);

  // No-auth notice (initial-dev-2qo): the app has no authentication, so
  // anything uploaded is visible to anyone. Blocks the first file-upload
  // attempt (new molecule, or replacing an existing file's contents) behind
  // an explicit acknowledgement, persisted via the same settings store as
  // the Sentry consent toggle (initial-dev-95a).
  let ackOpen = $state(false);
  let pendingUpload: (() => void) | null = null;

  function requireUploadAck(action: () => void) {
    // The no-auth notice warns that uploads are publicly visible. In
    // client-storage mode data never leaves the browser (IndexedDB), so the
    // notice would be false — skip it.
    if (useClientStorage() || settings.get('uploadAcknowledged')) {
      action();
      return;
    }
    pendingUpload = action;
    ackOpen = true;
  }

  // Shape shared by every remote form used below (upload/edit/replace): just
  // enough for submitLocal/makeEnhance to preflight-validate and read back a
  // server-shaped result.
  interface EnhanceForm {
    result?: { success?: boolean; error?: string } | null;
    fields: { allIssues: () => { message: string }[] | undefined };
    // `preflightOnly` is type-exposed by the remote form but undocumented
    // (experimental) — used here to validate offline without submitting.
    validate: (opts: {
      includeUntouched: boolean;
      preflightOnly: boolean;
    }) => Promise<unknown>;
  }

  /**
   * Client-storage submission: run the preflight schema offline (no server
   * round-trip), then hand the current field values to `write`. `extraCheck`
   * covers validation the schema can't (the hidden replace form's file input
   * isn't a form field); `onIssue`, left unset, means issues render inline via
   * the field machinery — the right default for every form except replace.
   */
  async function submitLocal(
    form: EnhanceForm,
    write: () => Promise<{ success?: boolean; error?: string }>,
    opts: {
      extraCheck?: () => string | null;
      onIssue?: (message: string) => void;
    } = {},
  ): Promise<void> {
    await form.validate({ includeUntouched: true, preflightOnly: true });
    const issue = form.fields.allIssues()?.[0]?.message ?? opts.extraCheck?.();
    if (issue) {
      opts.onIssue?.(issue);
      return;
    }
    localSubmitting = true;
    try {
      reportResult(await write());
    } finally {
      localSubmitting = false;
    }
  }

  /**
   * Single `.enhance()` seam for all four forms below: in client-storage mode
   * (`useClientStorage()`, checked at submit time) it writes via `write`
   * through submitLocal; otherwise it runs the form's normal server submit.
   * `catchMsg` is the fallback message for an unexpected (non-Error) throw.
   * `local` forwards submitLocal's options and also covers the remote-submit
   * failure path — only the hidden replace form sets it, since its issues
   * surface via `submitError` instead of inline field rendering.
   */
  function makeEnhance(
    form: EnhanceForm,
    write: () => Promise<{ success?: boolean; error?: string }>,
    catchMsg: string,
    local: {
      extraCheck?: () => string | null;
      onIssue?: (message: string) => void;
    } = {},
  ) {
    return async (f: { submit: () => Promise<boolean> }) => {
      submitError = null;
      try {
        if (useClientStorage()) {
          await submitLocal(form, write, local);
          return;
        }
        if (!(await f.submit())) {
          local.onIssue?.(
            form.fields.allIssues()?.[0]?.message ?? 'Invalid file.',
          );
          return;
        }
        reportResult(form.result ?? null);
      } catch (err) {
        submitError = err instanceof Error ? err.message : catchMsg;
      }
    };
  }

  function confirmUploadAck() {
    settings.set('uploadAcknowledged', true);
    ackOpen = false;
    const action = pendingUpload;
    pendingUpload = null;
    action?.();
  }

  // Dismissing without confirming (Esc / overlay / close button) cancels
  // the pending upload rather than bypassing the notice.
  $effect(() => {
    if (!ackOpen) pendingUpload = null;
  });

  // Contents preview / in-place editing (edit-file mode). `contents === null`
  // means still loading; the token discards stale loads across reopens.
  let contents = $state<string | null>(null);
  let contentsError = $state<string | null>(null);
  let contentsToken = 0;
  let editingContents = $state(false);
  let draftContents = $state('');
  let savingContents = $state(false);
  let replaceInput = $state<HTMLInputElement | null>(null);

  // All structure files sharing the molecule name (edit-molecule mode only).
  const groupFiles = $derived(
    intent.mode === 'edit-molecule'
      ? (molecules ?? []).filter((m) => m.moleculeName === intent.moleculeName)
      : [],
  );

  // Viewer mode. The server rejects molecule-level mutations when ANY file
  // is read-only (checkMoleculeEditable in db-source.ts), so mirror that
  // here rather than requiring every file to be read-only.
  const readOnly = $derived(
    intent.mode === 'edit-file'
      ? intent.molecule.readOnly
      : intent.mode === 'edit-molecule'
        ? groupFiles.some((m) => m.readOnly)
        : false,
  );

  // One dialog, three modes sharing chrome / footer / error handling. The
  // edit modes use `.for(...)` instances so drafts are isolated per entity.
  const fileForm = $derived(
    intent.mode === 'edit-file'
      ? editMoleculeFile.for(intent.molecule.id)
      : null,
  );
  const molForm = $derived(
    intent.mode === 'edit-molecule'
      ? editMolecule.for(intent.moleculeName)
      : null,
  );
  const replaceForm = $derived(
    intent.mode === 'edit-file'
      ? replaceMoleculeFile.for(intent.molecule.id)
      : null,
  );

  const submitting = $derived(
    localSubmitting ||
      uploadMolecule.pending > 0 ||
      (fileForm?.pending ?? 0) > 0 ||
      (molForm?.pending ?? 0) > 0 ||
      (replaceForm?.pending ?? 0) > 0,
  );

  function reportResult(result: { success?: boolean; error?: string } | null) {
    if (result?.success) {
      open = false;
      if (intent.mode === 'create') resetUpload();
    } else {
      submitError = result?.error ?? 'Unable to save changes.';
    }
  }

  // Computed once / cached by $derived: re-evaluating preflight()/enhance()
  // inside the template spread would produce a fresh attachment every render.
  const uploadProps = uploadMolecule.preflight(uploadMoleculeSchema).enhance(
    makeEnhance(
      uploadMolecule,
      async () => {
        if (!file) return { error: 'Select a file to upload.' };
        const fields = uploadMolecule.fields;
        const reference = fields.reference.value();
        return clientWrites.upload({
          file,
          moleculeName: fields.moleculeName.value() ?? '',
          description: fields.description.value() ?? '',
          state: Number(fields.state.value()),
          atomCount: Number(fields.atomCount.value()),
          reference: reference?.trim() ? reference.trim() : null,
        });
      },
      'Upload failed',
    ),
  );

  const fileFormProps = $derived.by(() => {
    const form = fileForm;
    if (!form) return null;
    return form.preflight(editMoleculeFileSchema).enhance(
      makeEnhance(
        form,
        () => {
          const fields = form.fields;
          const reference = fields.reference.value();
          return clientWrites.editFile({
            id: fields.id.value() ?? '',
            filename: fields.filename.value() ?? '',
            description: fields.description.value() ?? '',
            state: Number(fields.state.value()),
            reference: reference?.trim() ? reference.trim() : null,
          });
        },
        'Save failed',
      ),
    );
  });

  const molFormProps = $derived.by(() => {
    const form = molForm;
    if (!form) return null;
    return form.preflight(editMoleculeSchema).enhance(
      makeEnhance(
        form,
        () =>
          clientWrites.editMolecule({
            originalName: form.fields.originalName.value() ?? '',
            moleculeName: form.fields.moleculeName.value() ?? '',
          }),
        'Save failed',
      ),
    );
  });

  // The replace form is hidden and auto-submitted from the file input's
  // onchange, so its validation issues surface via submitError instead of
  // inline field errors (the `onIssue` option below). The replaced file's
  // name/contents/atom count all change on success; `reportResult` (via
  // makeEnhance) closes the dialog so the reopened one snapshots fresh values
  // from the table.
  const replaceFormProps = $derived.by(() => {
    const form = replaceForm;
    if (!form) return null;
    return form.preflight(replaceMoleculeFileSchema).enhance(
      makeEnhance(
        form,
        () =>
          clientWrites.replaceFile({
            id: form.fields.id.value() ?? '',
            file: replaceInput!.files![0],
          }),
        'Replace failed',
        {
          extraCheck: () =>
            replaceInput?.files?.[0] ? null : 'Select a file.',
          onIssue: (message) => {
            submitError = message;
          },
        },
      ),
    );
  });

  async function confirmDelete() {
    deleting = true;
    submitError = null;
    try {
      const result =
        intent.mode === 'edit-file'
          ? await deleteMoleculeFile({ id: intent.molecule.id })
          : intent.mode === 'edit-molecule'
            ? await deleteMolecule({ originalName: intent.moleculeName })
            : null;
      if (!result) return;
      confirmDeleteOpen = false;
      if (result.success) open = false;
      else submitError = result.error;
    } catch (err) {
      confirmDeleteOpen = false;
      submitError = err instanceof Error ? err.message : 'Delete failed';
    } finally {
      deleting = false;
    }
  }

  async function saveContents() {
    if (intent.mode !== 'edit-file') return;
    if (draftContents.length > MAX_UPLOAD_FILE_BYTES) {
      submitError = `Contents are too large; the maximum is ${Math.floor(MAX_UPLOAD_FILE_BYTES / 1024)} kB.`;
      return;
    }
    savingContents = true;
    submitError = null;
    try {
      const result = await editMoleculeFileContents({
        id: intent.molecule.id,
        contents: draftContents,
      });
      if (result.success) {
        contents = draftContents;
        editingContents = false;
      } else {
        submitError = result.error;
      }
    } catch (err) {
      submitError = err instanceof Error ? err.message : 'Save failed';
    } finally {
      savingContents = false;
    }
  }

  // Draft semantics: each open starts from the current entity values, so a
  // cancelled edit (Esc / Cancel) is discarded rather than lingering.
  $effect(() => {
    if (!open) return;
    submitError = null;
    fileError = null;
    fileWarning = null;
    confirmDeleteOpen = false;
    ackOpen = false;
    editingContents = false;
    if (intent.mode === 'edit-file') {
      fileForm?.fields.set({
        id: intent.molecule.id,
        filename: intent.molecule.filename,
        description: intent.molecule.description,
        state: intent.molecule.state,
        reference: intent.molecule.reference ?? '',
      });
      contents = null;
      contentsError = null;
      const token = ++contentsToken;
      getMoleculeFileContent(intent.molecule.id).then(
        (c) => {
          if (token === contentsToken) contents = c.contents;
        },
        () => {
          if (token === contentsToken)
            contentsError = 'Unable to load the file contents.';
        },
      );
    } else if (intent.mode === 'edit-molecule') {
      molForm?.fields.set({
        originalName: intent.moleculeName,
        moleculeName: intent.moleculeName,
      });
    } else if (intent.moleculeName) {
      uploadMolecule.fields.moleculeName.set(intent.moleculeName);
    }
  });

  const title = $derived.by(() => {
    if (intent.mode === 'edit-file')
      return `${readOnly ? 'Structure File' : 'Edit Structure File'} — ${intent.molecule.filename}`;
    if (intent.mode === 'edit-molecule')
      return `${readOnly ? 'Molecule' : 'Edit Molecule'} — ${intent.moleculeName}`;
    if (intent.moleculeName)
      return `Add Structure File — ${intent.moleculeName}`;
    return 'Upload Molecule File';
  });

  const description = $derived.by(() => {
    if (intent.mode === 'edit-file')
      return readOnly
        ? 'This structure file is read-only.'
        : 'Update the metadata or contents of this structure file.';
    if (intent.mode === 'edit-molecule')
      return readOnly
        ? 'This molecule is read-only.'
        : "Update the fields shared by all of this molecule's structure files.";
    return 'Upload an XYZ file containing molecular structure data.';
  });

  let filenameStem = $derived.by<string>(() => {
    if (!file) return '';
    return file.name.replace(/\.[^/.]+$/, '');
  });

  // Creating a brand-new molecule under an existing name (or renaming one
  // onto another) would silently merge the two groups — flag it instead.
  const nameConflict = $derived.by(() => {
    if (intent.mode === 'create' && !intent.moleculeName) {
      const name = uploadMolecule.fields.moleculeName.value();
      return !!name && !!molecules?.some((m) => m.moleculeName === name);
    }
    if (intent.mode === 'edit-molecule') {
      const name = molForm?.fields.moleculeName.value();
      return (
        !!name &&
        name !== intent.moleculeName &&
        !!molecules?.some((m) => m.moleculeName === name)
      );
    }
    return false;
  });

  function parseAtomCount(contents: string) {
    const firstLine = contents.split(/\r?\n/, 1)[0]?.trim();
    if (!firstLine) return null;
    const match = /^(\d+)/.exec(firstLine);
    if (!match) return null;
    const parsed = Number.parseInt(match[1], 10);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function resetUpload() {
    uploadMolecule.element?.reset();
    file = null;
    fileError = null;
    fileWarning = null;
    submitError = null;
  }

  function handleFileChange(event: Event) {
    const target = event.currentTarget as HTMLInputElement | null;
    const selected = target?.files?.[0] ?? null;
    file = selected;
    fileError = null;
    fileWarning = null;

    if (!selected) return;

    if (selected.size > MAX_UPLOAD_FILE_BYTES) {
      fileError = `File is too large; the maximum is ${Math.floor(MAX_UPLOAD_FILE_BYTES / 1024)} kB.`;
      return;
    }

    if (!uploadMolecule.fields.moleculeName.value()) {
      uploadMolecule.fields.moleculeName.set(filenameStem);
    }

    const token = ++fileReadToken;
    selected
      .text()
      .then((contents) => {
        if (token !== fileReadToken) return;
        const count = parseAtomCount(contents);
        if (count === null) {
          fileError = 'Unable to read the atom count from this file.';
          return;
        }
        if (count > MAX_UPLOAD_ATOM_COUNT) {
          fileError = `Structure has too many atoms (${count}); the maximum is ${MAX_UPLOAD_ATOM_COUNT}.`;
          return;
        }
        if (count > SOFT_ATOM_CAP) {
          fileWarning = `Large structure (${count} atoms): scattering is computed in your browser and may be slow above ${SOFT_ATOM_CAP} atoms. You can still continue.`;
        }
        uploadMolecule.fields.atomCount.set(count);
      })
      .catch(() => {
        if (token !== fileReadToken) return;
        fileError = 'Unable to read the selected file.';
      });
  }
</script>

{#snippet formFooter(
  submitLabel: string,
  formId?: string,
  requiresUploadAck = false,
)}
  {#if submitError}
    <div class="text-sm text-destructive">{submitError}</div>
  {/if}

  <Dialog.Footer>
    {#if intent.mode === 'edit-file' || intent.mode === 'edit-molecule'}
      <Button.Root
        type="button"
        variant="destructive"
        class="mr-auto"
        disabled={readOnly || deleting || submitting}
        onclick={() => (confirmDeleteOpen = true)}
      >
        {intent.mode === 'edit-file' ? 'Delete file' : 'Delete molecule'}
      </Button.Root>
    {/if}
    <Dialog.Close class={buttonVariants({ variant: 'outline' })}>
      {readOnly ? 'Close' : 'Cancel'}
    </Dialog.Close>
    <Button.Root
      type="submit"
      form={formId}
      disabled={submitting || nameConflict || readOnly}
      onclick={requiresUploadAck && !settings.get('uploadAcknowledged')
        ? (event) => {
            event.preventDefault();
            const form = (event.currentTarget as HTMLButtonElement).form;
            requireUploadAck(() => form?.requestSubmit());
          }
        : undefined}
    >
      {#if submitting}
        <Spinner class="mr-2 h-4 w-4 animate-spin" />
      {/if}
      {submitLabel}
    </Button.Root>
  </Dialog.Footer>
{/snippet}

<Dialog.Root bind:open>
  <Dialog.Content class="sm:max-w-130">
    <Dialog.Header>
      <Dialog.Title>{title}</Dialog.Title>
      <Dialog.Description>{description}</Dialog.Description>
    </Dialog.Header>

    {#if intent.mode === 'create'}
      {@const fields = uploadMolecule.fields}
      <form {...uploadProps} enctype="multipart/form-data" class="grid gap-6">
        <Field.Set>
          <Field.Legend>File</Field.Legend>
          <Field.Field
            data-invalid={fileError || fields.file.issues() ? true : undefined}
          >
            <Field.Label>Select File</Field.Label>
            <Field.Content>
              <!-- `files ?? undefined`: the remote-form field types `files` as
                   `FileList | null`, the Input prop as `FileList | undefined`. -->
              {@const fileProps = fields.file.as('file')}
              <Input
                {...fileProps}
                files={fileProps.files ?? undefined}
                accept=".xyz"
                onchange={handleFileChange}
              />
            </Field.Content>
            {#each fields.file.issues() ?? [] as issue (issue.message)}
              <Field.Error>{issue.message}</Field.Error>
            {/each}
            {#if fileError}
              <Field.Error>{fileError}</Field.Error>
            {/if}
            {#if fileWarning}
              <Field.Description class="text-amber-600 dark:text-amber-500">
                {fileWarning}
              </Field.Description>
            {/if}
          </Field.Field>
        </Field.Set>

        <Field.Set>
          <Field.Legend>Metadata</Field.Legend>
          <Field.Group class="grid gap-4">
            <Field.Field
              data-invalid={nameConflict || fields.moleculeName.issues()
                ? true
                : undefined}
            >
              <Field.FieldLabel>Molecule Name</Field.FieldLabel>
              <Field.Content>
                <Input
                  {...fields.moleculeName.as('text')}
                  placeholder={filenameStem || 'Molecule name'}
                />
              </Field.Content>
              {#if nameConflict}
                <Field.Error
                  >A molecule with this name already exists.</Field.Error
                >
              {/if}
              {#each fields.moleculeName.issues() ?? [] as issue (issue.message)}
                <Field.Error>{issue.message}</Field.Error>
              {/each}
            </Field.Field>

            <Field.Field
              data-invalid={fields.description.issues() ? true : undefined}
            >
              <Field.FieldLabel>Description</Field.FieldLabel>
              <Field.Content>
                <Textarea.Root
                  {...fields.description.as('text')}
                  rows={3}
                  placeholder="Describe the molecule"
                />
              </Field.Content>
              {#each fields.description.issues() ?? [] as issue (issue.message)}
                <Field.Error>{issue.message}</Field.Error>
              {/each}
            </Field.Field>

            <Field.Field
              data-invalid={fields.state.issues() ? true : undefined}
            >
              <Field.FieldLabel>State</Field.FieldLabel>
              <Field.Content>
                <Input {...fields.state.as('number', 0)} min="0" step="1" />
              </Field.Content>
              <Field.Description
                >Use 0 for ground and 1 for excited.</Field.Description
              >
              {#each fields.state.issues() ?? [] as issue (issue.message)}
                <Field.Error>{issue.message}</Field.Error>
              {/each}
            </Field.Field>

            <Field.Field
              data-invalid={fields.atomCount.issues() ? true : undefined}
            >
              <Field.FieldLabel>Atom Count</Field.FieldLabel>
              <Field.Content>
                <Input {...fields.atomCount.as('number')} min="1" step="1" />
              </Field.Content>
              <Field.Description
                >Prefilled from the .xyz file.</Field.Description
              >
              {#each fields.atomCount.issues() ?? [] as issue (issue.message)}
                <Field.Error>{issue.message}</Field.Error>
              {/each}
            </Field.Field>

            <Field.Field
              data-invalid={fields.reference.issues() ? true : undefined}
            >
              <Field.FieldLabel>Reference</Field.FieldLabel>
              <Field.Content>
                <Input
                  {...fields.reference.as('text')}
                  placeholder="DOI or citation (optional)"
                />
              </Field.Content>
              {#each fields.reference.issues() ?? [] as issue (issue.message)}
                <Field.Error>{issue.message}</Field.Error>
              {/each}
            </Field.Field>
          </Field.Group>
        </Field.Set>

        {@render formFooter('Upload', undefined, true)}
      </form>
    {:else if intent.mode === 'edit-file' && fileForm && fileFormProps}
      {@const fields = fileForm.fields}
      <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>{intent.molecule.atomCount} atoms</span>
        <span>Created {intent.molecule.createdAt.toLocaleString()}</span>
        {#if intent.molecule.updatedAt}
          <span>Updated {intent.molecule.updatedAt.toLocaleString()}</span>
        {/if}
      </div>

      <form {...fileFormProps} id="edit-file-metadata-form" class="grid gap-6">
        <input {...fields.id.as('hidden', intent.molecule.id)} />
        <Field.Group class="grid gap-4">
          <Field.Field
            data-invalid={fields.filename.issues() ? true : undefined}
          >
            <Field.FieldLabel>Filename</Field.FieldLabel>
            <Field.Content>
              <Input {...fields.filename.as('text')} disabled={readOnly} />
            </Field.Content>
            {#each fields.filename.issues() ?? [] as issue (issue.message)}
              <Field.Error>{issue.message}</Field.Error>
            {/each}
          </Field.Field>

          <Field.Field
            data-invalid={fields.description.issues() ? true : undefined}
          >
            <Field.FieldLabel>Description</Field.FieldLabel>
            <Field.Content>
              <Textarea.Root
                {...fields.description.as('text')}
                rows={3}
                placeholder="Describe this structure"
                disabled={readOnly}
              />
            </Field.Content>
            {#each fields.description.issues() ?? [] as issue (issue.message)}
              <Field.Error>{issue.message}</Field.Error>
            {/each}
          </Field.Field>

          <Field.Field data-invalid={fields.state.issues() ? true : undefined}>
            <Field.FieldLabel>State</Field.FieldLabel>
            <Field.Content>
              <Input
                {...fields.state.as('number')}
                min="0"
                step="1"
                disabled={readOnly}
              />
            </Field.Content>
            <Field.Description
              >Use 0 for ground and 1 for excited.</Field.Description
            >
            {#each fields.state.issues() ?? [] as issue (issue.message)}
              <Field.Error>{issue.message}</Field.Error>
            {/each}
          </Field.Field>

          <Field.Field
            data-invalid={fields.reference.issues() ? true : undefined}
          >
            <Field.FieldLabel>Reference</Field.FieldLabel>
            <Field.Content>
              <Input
                {...fields.reference.as('text')}
                placeholder="DOI or citation (optional)"
                disabled={readOnly}
              />
            </Field.Content>
            {#each fields.reference.issues() ?? [] as issue (issue.message)}
              <Field.Error>{issue.message}</Field.Error>
            {/each}
          </Field.Field>
        </Field.Group>
      </form>

      <Field.Set>
        <Field.Legend>Contents</Field.Legend>
        {#if editingContents}
          <Textarea.Root
            bind:value={draftContents}
            rows={10}
            class="font-mono text-xs"
          />
          <div class="flex gap-2">
            <Button.Root
              type="button"
              size="sm"
              disabled={savingContents}
              onclick={saveContents}
            >
              {#if savingContents}
                <Spinner class="mr-2 h-4 w-4 animate-spin" />
              {/if}
              Save contents
            </Button.Root>
            <Button.Root
              type="button"
              size="sm"
              variant="outline"
              disabled={savingContents}
              onclick={() => (editingContents = false)}
            >
              Cancel
            </Button.Root>
          </div>
        {:else}
          {#if contentsError}
            <div class="text-sm text-destructive">{contentsError}</div>
          {:else if contents === null}
            <Spinner class="h-4 w-4 animate-spin" />
          {:else}
            <pre
              class="max-h-56 overflow-auto rounded-md bg-inset p-3 font-mono text-xs">{contents}</pre>
          {/if}
          {#if !readOnly}
            <div class="flex gap-2">
              <Button.Root
                type="button"
                size="sm"
                variant="outline"
                disabled={contents === null || submitting}
                onclick={() => {
                  draftContents = contents ?? '';
                  editingContents = true;
                }}
              >
                Edit
              </Button.Root>
              <Button.Root
                type="button"
                size="sm"
                variant="outline"
                disabled={submitting}
                onclick={() => replaceInput?.click()}
              >
                Replace file…
              </Button.Root>
            </div>
          {/if}
        {/if}
      </Field.Set>

      {#if replaceForm && replaceFormProps}
        {@const replaceFileProps = replaceForm.fields.file.as('file')}
        <form
          {...replaceFormProps}
          enctype="multipart/form-data"
          class="hidden"
        >
          <input {...replaceForm.fields.id.as('hidden', intent.molecule.id)} />
          <input
            bind:this={replaceInput}
            {...replaceFileProps}
            files={replaceFileProps.files ?? undefined}
            accept=".xyz"
            onchange={(e) => {
              const form = e.currentTarget.form;
              requireUploadAck(() => form?.requestSubmit());
            }}
          />
        </form>
      {/if}

      {@render formFooter('Save changes', 'edit-file-metadata-form')}
    {:else if intent.mode === 'edit-molecule' && molForm && molFormProps}
      {@const fields = molForm.fields}
      <form {...molFormProps} class="grid gap-6">
        <input {...fields.originalName.as('hidden', intent.moleculeName)} />
        <div class="text-xs text-muted-foreground">
          {intent.atomCount} atoms · {groupFiles.length} structure
          {groupFiles.length === 1 ? 'file' : 'files'} (derived from the files, not
          editable)
        </div>
        <Field.Group class="grid gap-4">
          <Field.Field
            data-invalid={nameConflict || fields.moleculeName.issues()
              ? true
              : undefined}
          >
            <Field.FieldLabel>Molecule Name</Field.FieldLabel>
            <Field.Content>
              <Input {...fields.moleculeName.as('text')} disabled={readOnly} />
            </Field.Content>
            {#if nameConflict}
              <Field.Error
                >A molecule with this name already exists.</Field.Error
              >
            {/if}
            {#each fields.moleculeName.issues() ?? [] as issue (issue.message)}
              <Field.Error>{issue.message}</Field.Error>
            {/each}
          </Field.Field>
        </Field.Group>

        {@render formFooter('Save changes')}
      </form>
    {/if}
  </Dialog.Content>
</Dialog.Root>

<!-- Delete confirmation, guarding the deleteMoleculeFile/deleteMolecule
     commands (both cascade to cached simulation results server-side). -->
<Dialog.Root bind:open={confirmDeleteOpen}>
  <Dialog.Content class="sm:max-w-100">
    <Dialog.Header>
      <Dialog.Title>
        {intent.mode === 'edit-file'
          ? 'Delete structure file?'
          : 'Delete molecule?'}
      </Dialog.Title>
      <Dialog.Description>
        {#if intent.mode === 'edit-file'}
          This deletes “{intent.molecule.filename}” and clears any cached
          simulation results for it. This cannot be undone.
        {:else if intent.mode === 'edit-molecule'}
          This deletes “{intent.moleculeName}” and all {groupFiles.length} of its
          structure {groupFiles.length === 1 ? 'file' : 'files'}, including any
          cached simulation results. This cannot be undone.
        {/if}
      </Dialog.Description>
    </Dialog.Header>
    <Dialog.Footer>
      <Dialog.Close class={buttonVariants({ variant: 'outline' })}>
        Cancel
      </Dialog.Close>
      <Button.Root
        type="button"
        variant="destructive"
        disabled={deleting}
        onclick={confirmDelete}
      >
        {#if deleting}
          <Spinner class="mr-2 h-4 w-4 animate-spin" />
        {/if}
        Delete
      </Button.Root>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<!-- No-auth notice (initial-dev-2qo), blocking the first file upload
     (new molecule or file replace) until explicitly acknowledged. -->
<Dialog.Root bind:open={ackOpen}>
  <Dialog.Content class="sm:max-w-100" showCloseButton={false}>
    <Dialog.Header>
      <Dialog.Title>This app has no authentication</Dialog.Title>
      <Dialog.Description>
        Anything you upload — the file and its metadata — is visible to anyone
        who can reach this site. Don't upload anything you wouldn't want
        publicly accessible.
      </Dialog.Description>
    </Dialog.Header>
    <Dialog.Footer>
      <Dialog.Close class={buttonVariants({ variant: 'outline' })}>
        Cancel
      </Dialog.Close>
      <Button.Root type="button" onclick={confirmUploadAck}>
        I understand, upload anyway
      </Button.Root>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
