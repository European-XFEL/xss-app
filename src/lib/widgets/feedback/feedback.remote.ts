/**
 * Remote command for submitting feedback
 * (https://svelte.dev/docs/kit/remote-functions#command).
 *
 * Replaces POST /api/feedback. A `command` (not `form`): FeedbackDialog
 * assembles the payload programmatically (including a canvas-captured
 * region image), so there is no form element to progressively enhance.
 *
 * Returns the created feedback id or throws — errors reach the caller as
 * typed exceptions, so the old `{ success, id }` envelope is gone.
 *
 * ponytail: no STATIC guard — the dialog is disabled on static builds
 * (capabilities.feedback is unavailable) and the static host has no server
 * to run a command on, so a guard here could never execute.
 */
import { command } from '$app/server';

import { feedbackSource } from '$lib/server/data';
import { feedbackSchema } from '$lib/shared/api/validation';

export const submitFeedback = command(feedbackSchema, async (data) => {
  return await feedbackSource.createFeedback(data);
});
