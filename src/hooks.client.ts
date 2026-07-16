import * as Sentry from '@sentry/sveltekit';

import { dev, version } from '$app/env';
import {
  PUBLIC_SENTRY_DSN,
  PUBLIC_SENTRY_FEEDBACK,
  PUBLIC_SENTRY_LOGS,
  PUBLIC_SENTRY_METRICS,
  PUBLIC_SENTRY_PROFILING,
  PUBLIC_SENTRY_REPLAY,
  PUBLIC_SENTRY_TRACES,
  PUBLIC_TARGET,
} from '$app/env/public';

// Feature toggles default to on; set the env var to "false" to disable.
const on = (flag: string | undefined) => flag !== 'false';

Sentry.init({
  dsn: PUBLIC_SENTRY_DSN,
  enabled: Boolean(PUBLIC_SENTRY_DSN),
  environment: dev ? 'development' : 'production',
  // kit.version.name — "<target>-<git describe>" (svelte.config.js).
  release: version,
  // Route envelopes through our own /monitoring server route instead of
  // POSTing to ingest.sentry.io directly — Firefox ETP and ad-blockers treat
  // the latter as third-party tracking and block it with a CORS failure.
  // No server route exists on static (GitHub Pages) builds, so skip there.
  tunnel: PUBLIC_TARGET === 'static' ? undefined : '/monitoring',
  tracesSampleRate: on(PUBLIC_SENTRY_TRACES) ? 1.0 : 0,
  enableLogs: on(PUBLIC_SENTRY_LOGS),
  enableMetrics: on(PUBLIC_SENTRY_METRICS),
  // Record 10% of sessions, and always the full session when it errors.
  replaysSessionSampleRate: on(PUBLIC_SENTRY_REPLAY) ? 0.1 : 0,
  replaysOnErrorSampleRate: on(PUBLIC_SENTRY_REPLAY) ? 1.0 : 0,
  // Profile whole sessions, capturing while a trace is active. Also needs
  // the Document-Policy: js-profiling response header (hooks.server.ts).
  profileSessionSampleRate: on(PUBLIC_SENTRY_PROFILING) ? 1.0 : 0,
  profileLifecycle: 'trace',
  integrations: [
    ...(on(PUBLIC_SENTRY_REPLAY) ? [Sentry.replayIntegration()] : []),
    ...(on(PUBLIC_SENTRY_PROFILING)
      ? [Sentry.browserProfilingIntegration()]
      : []),
    // autoInject: false — the sidebar FeedbackButton opens the form instead
    // of Sentry's floating action button. Text overrides turn the default
    // bug-report dialog into a generic feedback one (suggestions,
    // corrections, bugs).
    ...(on(PUBLIC_SENTRY_FEEDBACK)
      ? [
          Sentry.feedbackIntegration({
            autoInject: false,
            colorScheme: 'system',
            formTitle: 'Share Feedback',
            messageLabel: 'Feedback',
            messagePlaceholder:
              'What would you like to share? Suggestions, corrections, bugs...',
            submitButtonLabel: 'Send Feedback',
            successMessageText: 'Thank you for your feedback!',
          }),
        ]
      : []),
  ],
});

export const handleError = Sentry.handleErrorWithSentry();
