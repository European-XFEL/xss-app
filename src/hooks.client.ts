import * as Sentry from '@sentry/sveltekit';

import { dev, version } from '$app/env';
import { PUBLIC_SENTRY_DSN } from '$app/env/public';

Sentry.init({
  dsn: PUBLIC_SENTRY_DSN,
  enabled: Boolean(PUBLIC_SENTRY_DSN),
  environment: dev ? 'development' : 'production',
  // kit.version.name — "<target>-<git describe>" (svelte.config.js).
  release: version,
  tracesSampleRate: 1.0,
  enableLogs: true,
  // Record 10% of sessions, and always the full session when it errors.
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  integrations: [
    Sentry.replayIntegration(),
    // autoInject: false — the sidebar FeedbackButton opens the form instead
    // of Sentry's floating action button. Text overrides turn the default
    // bug-report dialog into a generic feedback one (suggestions,
    // corrections, bugs).
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
  ],
});

export const handleError = Sentry.handleErrorWithSentry();
