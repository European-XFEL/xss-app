import { expect, test } from 'vitest';
import { render } from 'vitest-browser-svelte';

import NumSlider from './NumSlider.svelte';

// Guards the regression fixed in 4a35b6d: in logarithmic mode, bits-ui's
// controlled Slider re-emits onValueChange whenever its `value` prop changes
// for ANY reason, including its own internal step-grid rounding. Typing a
// precise value into the paired number input changes NumSlider's derived
// slider value, which used to bounce straight back through onValueChange and
// clobber the typed value with a coarse log-grid snap. Wiring the write-back
// through onValueCommit (drag-release/keyboard only) instead of onValueChange
// stops that echo. If this regresses, the assertion below fails because the
// input reverts to a rounded value instead of keeping "42.195".
test('log-mode slider does not clobber a precisely typed value', async () => {
  const screen = await render(NumSlider, {
    label: 'Solute Concentration (mol/L)',
    min: '0.001',
    max: '100',
    step: '0.001',
    logarithmic: true,
    value: 1,
  });

  const input = screen.getByRole('spinbutton');
  await input.fill('42.195');

  await expect.element(input).toHaveValue(42.195);
});
