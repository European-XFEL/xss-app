<script lang="ts">
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
    uploadMolecule,
  } from '$lib/molecule/molecule.remote';
  import {
    editMoleculeFileSchema,
    editMoleculeSchema,
    uploadMoleculeSchema,
  } from '$lib/shared/api/validation';
  import {
    MAX_UPLOAD_ATOM_COUNT,
    MAX_UPLOAD_FILE_BYTES,
  } from '$lib/shared/contracts';
  import type { MoleculeInfo } from '$lib/shared/contracts';

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
  // Errors from reading/parsing the selected file (schema covers the rest).
  let fileError = $state<string | null>(null);
  let fileReadToken = 0;
  let file = $state<File | null>(null);

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

  const submitting = $derived(
    uploadMolecule.pending > 0 ||
      (fileForm?.pending ?? 0) > 0 ||
      (molForm?.pending ?? 0) > 0,
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
  const uploadProps = uploadMolecule
    .preflight(uploadMoleculeSchema)
    .enhance(async (f) => {
      submitError = null;
      try {
        if (!(await f.submit())) return; // validation issues render inline
        const result = uploadMolecule.result;
        reportResult(
          result?.success && result.result
            ? { success: true }
            : { error: result?.error ?? 'Unable to upload molecule.' },
        );
      } catch (err) {
        submitError = err instanceof Error ? err.message : 'Upload failed';
      }
    });

  const fileFormProps = $derived.by(() => {
    const form = fileForm;
    if (!form) return null;
    return form.preflight(editMoleculeFileSchema).enhance(async (f) => {
      submitError = null;
      try {
        if (!(await f.submit())) return;
        reportResult(form.result ?? null);
      } catch (err) {
        submitError = err instanceof Error ? err.message : 'Save failed';
      }
    });
  });

  const molFormProps = $derived.by(() => {
    const form = molForm;
    if (!form) return null;
    return form.preflight(editMoleculeSchema).enhance(async (f) => {
      submitError = null;
      try {
        if (!(await f.submit())) return;
        reportResult(form.result ?? null);
      } catch (err) {
        submitError = err instanceof Error ? err.message : 'Save failed';
      }
    });
  });

  // Draft semantics: each open starts from the current entity values, so a
  // cancelled edit (Esc / Cancel) is discarded rather than lingering.
  $effect(() => {
    if (!open) return;
    submitError = null;
    fileError = null;
    if (intent.mode === 'edit-file') {
      fileForm?.fields.set({
        id: intent.molecule.id,
        filename: intent.molecule.filename,
        description: intent.molecule.description,
        state: intent.molecule.state,
        reference: intent.molecule.reference ?? '',
      });
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
      return `Edit Structure File — ${intent.molecule.filename}`;
    if (intent.mode === 'edit-molecule')
      return `Edit Molecule — ${intent.moleculeName}`;
    if (intent.moleculeName)
      return `Add Structure File — ${intent.moleculeName}`;
    return 'Upload Molecule File';
  });

  const description = $derived.by(() => {
    if (intent.mode === 'edit-file')
      return 'Update the metadata of this structure file.';
    if (intent.mode === 'edit-molecule')
      return "Update the fields shared by all of this molecule's structure files.";
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
    submitError = null;
  }

  function handleFileChange(event: Event) {
    const target = event.currentTarget as HTMLInputElement | null;
    const selected = target?.files?.[0] ?? null;
    file = selected;
    fileError = null;

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
        uploadMolecule.fields.atomCount.set(count);
      })
      .catch(() => {
        if (token !== fileReadToken) return;
        fileError = 'Unable to read the selected file.';
      });
  }
</script>

{#snippet formFooter(submitLabel: string)}
  {#if submitError}
    <div class="text-sm text-destructive">{submitError}</div>
  {/if}

  <Dialog.Footer>
    <Dialog.Close class={buttonVariants({ variant: 'outline' })}>
      Cancel
    </Dialog.Close>
    <Button.Root type="submit" disabled={submitting || nameConflict}>
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

        {@render formFooter('Upload')}
      </form>
    {:else if intent.mode === 'edit-file' && fileForm && fileFormProps}
      {@const fields = fileForm.fields}
      <form {...fileFormProps} class="grid gap-6">
        <input {...fields.id.as('hidden', intent.molecule.id)} />
        <Field.Group class="grid gap-4">
          <Field.Field
            data-invalid={fields.filename.issues() ? true : undefined}
          >
            <Field.FieldLabel>Filename</Field.FieldLabel>
            <Field.Content>
              <Input {...fields.filename.as('text')} />
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
              />
            </Field.Content>
            {#each fields.description.issues() ?? [] as issue (issue.message)}
              <Field.Error>{issue.message}</Field.Error>
            {/each}
          </Field.Field>

          <Field.Field data-invalid={fields.state.issues() ? true : undefined}>
            <Field.FieldLabel>State</Field.FieldLabel>
            <Field.Content>
              <Input {...fields.state.as('number')} min="0" step="1" />
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
              />
            </Field.Content>
            {#each fields.reference.issues() ?? [] as issue (issue.message)}
              <Field.Error>{issue.message}</Field.Error>
            {/each}
          </Field.Field>
        </Field.Group>

        {@render formFooter('Save changes')}
      </form>
    {:else if intent.mode === 'edit-molecule' && molForm && molFormProps}
      {@const fields = molForm.fields}
      <form {...molFormProps} class="grid gap-6">
        <input {...fields.originalName.as('hidden', intent.moleculeName)} />
        <Field.Group class="grid gap-4">
          <Field.Field
            data-invalid={nameConflict || fields.moleculeName.issues()
              ? true
              : undefined}
          >
            <Field.FieldLabel>Molecule Name</Field.FieldLabel>
            <Field.Content>
              <Input {...fields.moleculeName.as('text')} />
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
