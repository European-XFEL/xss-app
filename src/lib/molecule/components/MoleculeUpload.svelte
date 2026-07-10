<script lang="ts">
  import { page } from '$app/state';

  import * as Button from '$shadcn/ui/button/index.js';
  import { buttonVariants } from '$shadcn/ui/button/index.js';
  import * as Dialog from '$shadcn/ui/dialog/index.js';
  import * as Field from '$shadcn/ui/field/index.js';
  import { Input } from '$shadcn/ui/input/index.js';
  import Spinner from '$shadcn/ui/spinner/spinner.svelte';
  import * as Textarea from '$shadcn/ui/textarea/index.js';
  import * as Tooltip from '$shadcn/ui/tooltip/index.js';

  import { uploadMolecule } from '$lib/molecule/upload.remote';
  import type { listMolecules } from '$lib/shared/api/api';
  import { uploadMoleculeSchema } from '$lib/shared/api/validation';
  import {
    MAX_UPLOAD_ATOM_COUNT,
    MAX_UPLOAD_FILE_BYTES,
  } from '$lib/shared/contracts';
  import type { Capability } from '$lib/shared/health';

  type Molecules = Awaited<ReturnType<typeof listMolecules>>;

  interface Props {
    molecules?: Molecules;
    capability?: Capability;
  }

  let {
    molecules = $bindable(),
    capability = page.data.capabilities.upload,
  }: Props = $props();

  let disabled = $derived(!capability.available);
  let disabledMessage = $derived(
    !capability.available ? capability.reason : '',
  );

  const fields = uploadMolecule.fields;

  // Computed once: re-evaluating preflight()/enhance() inside the template
  // spread would produce a fresh attachment on every render.
  const formProps = uploadMolecule
    .preflight(uploadMoleculeSchema)
    .enhance(async (f) => {
      submitError = null;
      try {
        if (!(await f.submit())) return; // validation issues render inline
        const result = uploadMolecule.result;
        if (result?.success && result.result) {
          if (result.result.id !== lastUploadedId && molecules) {
            molecules.push(result.result);
          }
          lastUploadedId = result.result.id;
          open = false;
          resetForm();
        } else {
          submitError = result?.error ?? 'Unable to upload molecule.';
        }
      } catch (err) {
        submitError = err instanceof Error ? err.message : 'Upload failed';
      }
    });

  let open = $state(false);
  let lastUploadedId = $state<string | null>(null);
  // Errors from reading/parsing the selected file (schema covers the rest).
  let fileError = $state<string | null>(null);
  let submitError = $state<string | null>(null);
  let fileReadToken = 0;
  let file = $state<File | null>(null);

  let submitting = $derived(uploadMolecule.pending > 0);

  let filenameStem = $derived.by<string>(() => {
    if (!file) return '';
    return file.name.replace(/\.[^/.]+$/, '');
  });

  let nameConflict = $derived.by(() => {
    const name = fields.moleculeName.value();
    return !!name && !!molecules?.some((m) => m.moleculeName === name);
  });

  function parseAtomCount(contents: string) {
    const firstLine = contents.split(/\r?\n/, 1)[0]?.trim();
    if (!firstLine) return null;
    const match = /^(\d+)/.exec(firstLine);
    if (!match) return null;
    const parsed = Number.parseInt(match[1], 10);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function resetForm() {
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

    if (!fields.moleculeName.value()) {
      fields.moleculeName.set(filenameStem);
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
        fields.atomCount.set(count);
      })
      .catch(() => {
        if (token !== fileReadToken) return;
        fileError = 'Unable to read the selected file.';
      });
  }
</script>

<Dialog.Root bind:open>
  {#if disabled}
    <Tooltip.Root>
      <Tooltip.Trigger>
        <span class="inline-flex">
          <Dialog.Trigger
            class={buttonVariants({ variant: 'outline' })}
            disabled
          >
            Upload
          </Dialog.Trigger>
        </span>
      </Tooltip.Trigger>
      <Tooltip.Content side="top" align="center">
        {disabledMessage}
      </Tooltip.Content>
    </Tooltip.Root>
  {:else}
    <Dialog.Trigger class={buttonVariants({ variant: 'outline' })}>
      Upload
    </Dialog.Trigger>
  {/if}
  <Dialog.Content class="sm:max-w-130">
    <Dialog.Header>
      <Dialog.Title>Upload Molecule File</Dialog.Title>
      <Dialog.Description>
        Upload an XYZ file containing molecular structure data.
      </Dialog.Description>
    </Dialog.Header>

    <form {...formProps} enctype="multipart/form-data" class="grid gap-6">
      <Field.Set>
        <Field.Legend>File</Field.Legend>
        <Field.Field
          data-invalid={fileError || fields.file.issues() ? true : undefined}
        >
          <Field.Label>Select File</Field.Label>
          <Field.Content>
            <Input
              {...fields.file.as('file')}
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

          <Field.Field data-invalid={fields.state.issues() ? true : undefined}>
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
            <Field.Description>Prefilled from the .xyz file.</Field.Description>
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
          Upload
        </Button.Root>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>
