import { PUBLIC_TARGET } from '$app/env/public';

import type { FeedbackInput, FeedbackResult } from '$lib/shared/contracts';

const STATIC = PUBLIC_TARGET === 'static';

// Molecule list/detail/upload go through the remote functions in
// $lib/molecule/molecule.remote. Solvent list/detail go through the remote
// functions in $lib/sample/solvent.remote. The Debye simulation goes through
// the remote query in $lib/simulation/simulation.remote.

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
