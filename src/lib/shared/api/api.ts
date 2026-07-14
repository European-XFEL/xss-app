import { PUBLIC_TARGET } from '$app/env/public';

import type {
  DebyeResult,
  FeedbackInput,
  FeedbackResult,
  SimRequest,
} from '$lib/shared/contracts';

const STATIC = PUBLIC_TARGET === 'static';

// Molecule list/detail/upload go through the remote functions in
// $lib/molecule/molecule.remote. Solvent list/detail go through the remote
// functions in $lib/sample/solvent.remote.

export async function getDebyeResult(
  request: SimRequest,
): Promise<DebyeResult> {
  const res = await fetch('/api/simulation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    throw new Error(
      `Failed to get Debye result: ${res.status} ${res.statusText}`,
    );
  }
  return res.json();
}

export async function submitFeedback(
  data: FeedbackInput,
): Promise<FeedbackResult> {
  if (STATIC) {
    return {
      success: false,
      id: null,
    };
  }

  const res = await fetch('/api/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(
      `Failed to submit feedback: ${res.status} ${res.statusText} ${text}`,
    );
  }

  return res.json();
}
