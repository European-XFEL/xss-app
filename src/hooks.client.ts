import * as Sentry from '@sentry/sveltekit';

import { PUBLIC_SENTRY_DSN } from '$app/env/public';

Sentry.init({
  dsn: PUBLIC_SENTRY_DSN,
  enabled: Boolean(PUBLIC_SENTRY_DSN),
  tracesSampleRate: 1.0,
  integrations: [
    // autoInject: false — the sidebar FeedbackButton opens the form instead
    // of Sentry's floating action button.
    Sentry.feedbackIntegration({ autoInject: false, colorScheme: 'system' }),
  ],
});

export const handleError = Sentry.handleErrorWithSentry();
