<script lang="ts">
  import { TriangleAlert } from '@lucide/svelte';
  import katex from 'katex';

  import { ChannelPanel, Latex } from '$lib/shared/ui';

  const eqDebye = String.raw`I(Q) = \sum_{i=1}^{N} \sum_{j=1}^{N} f_i(Q) f_j(Q) \frac{\sin(Q r_{ij})}{Q r_{ij}}`;

  const defsLeft = String.raw`
    \begin{aligned}
      f_i(Q) &\coloneqq \text{atomic form factor for atom } i \\
      r_{ij} &\coloneqq \lVert \mathbf{r}_i - \mathbf{r}_j \rVert \text{ (interatomic distance in } \AA\text{)} \\
      2\theta &\coloneqq \text{scattering angle}; \quad \theta = \text{half-angle} \\
      Q &\coloneqq \frac{4\pi}{\lambda} \sin(\theta) \text{ (momentum transfer in } \AA^{-1}\text{)}
    \end{aligned}
  `;

  const defsRight = String.raw`
    \begin{aligned}
      I_{\text{pairs}}(Q) = \sum_{i<j} f_i(Q) f_j(Q) \frac{\sin(Qr_{ij})}{Qr_{ij}} &\colon \text{pair contributions} \\
      I_{\text{self}}(Q) = \sum_{i=1}^{N} f_i^2(Q) &\colon \text{self-terms (diagonal)} \\
      I(Q) = 2 I_{\text{pairs}}(Q) + I_{\text{self}}(Q) &\colon \text{total intensity} \\
      \mathcal{O}(N^2, N_Q) &\colon \text{complexity for } N \text{ atoms, } N_Q \text{ Q-points}
    \end{aligned}
  `;

  const eqCromerMann = String.raw`f_0(Q) = \sum_{k=1}^{4} a_k \exp\left(-b_k \left(\frac{Q}{4\pi}\right)^2\right) + c`;

  const pipeline = [
    {
      title: 'Solute Difference',
      body: `
        <p>Load ground and excited state structures (XYZ), compute intensities:</p>
        ${katex.renderToString(
          String.raw`\Delta I(Q) = I_{\text{excited}}(Q) - I_{\text{ground}}(Q)`,
          { displayMode: true },
        )}
      `,
    },
    {
      title: 'Solvent Response',
      body: `
        <p>Load experimental ${katex.renderToString(
          String.raw`(\partial S/\partial T)`,
        )} data and interpolate onto the Q grid.</p>
        <br>
        <p>This is multiplied by a scalar temperature rise (or fitted amplitude) to estimate the solvent contribution to the signal.</p>
      `,
    },
    {
      title: 'Combined Signal',
      body: `
        <p>The measured difference signal combines both contributions:</p>
        ${katex.renderToString(
          String.raw`\Delta I(Q,t) \approx \alpha(t) \cdot \Delta I_{\text{solute}}(Q) + \beta(t) \cdot \Delta I_{\text{solvent,unit}}(Q)`,
          { displayMode: true },
        )}
        where ${katex.renderToString(
          String.raw`\alpha(t)`,
        )} is the time-dependent excited state fraction, and ${katex.renderToString(
          String.raw`\beta(t)`,
        )} is the solvent-heating amplitude (e.g., proportional to temperature jump).
      `,
    },
  ] as const;

  const imagePipeline = [
    {
      title: 'Forward project 1D signal onto detector coordinates',
      body: `
        <p>Simulated 1D difference signal is projected onto detector geometry.</p>
        <br>
        <p>The 1D curve is mapped to a 2D image (radius vs azimuthal angle).</p>
      `,
    },
    {
      title: 'Map radial coordinate → pixel geometry',
      body: `
        <p>Each pixel is assigned a scattering vector from the detector geometry: with sample-detector
        distance ${katex.renderToString(String.raw`D`)}, beam center, and pixel pitch, the scattering angle
        follows from ${katex.renderToString(String.raw`r = D \tan 2\theta`)} and
        ${katex.renderToString(String.raw`Q = 4\pi \sin\theta / \lambda`)}.</p>
        <br>
        <p>Module layouts (positions, gaps, and rotations of the detector quadrants) are applied here, so
        masked regions and inter-module gaps appear in the image exactly as they would in a measurement.</p>
      `,
    },
    {
      title: 'Apply absorption',
      body: `
        <p>Scattered X-rays are attenuated along their path through the sample and any downstream media.
        The transmission depends on the path length, which grows with scattering angle, so absorption
        imprints a smooth radial envelope on the image.</p>
      `,
    },
    {
      title: 'Apply solid-angle correction',
      body: `
        <p>A flat detector does not sample the scattering sphere uniformly: pixels far from the beam
        center are further away and viewed obliquely, subtending a smaller solid angle
        (${katex.renderToString(String.raw`\propto \cos^3 2\theta`)} for a perpendicular detector).</p>
        <br>
        <p>The per-pixel solid angle scales the expected intensity accordingly.</p>
      `,
    },
    {
      title: 'Apply polarization correction',
      body: `
        <p>The XFEL beam is (predominantly) horizontally polarized, so Thomson scattering is suppressed
        in the polarization plane. The resulting factor depends on both scattering angle and azimuth,
        breaking the azimuthal symmetry of the rings.</p>
      `,
    },
    {
      title: 'Apply flat-field',
      body: `
        <p>Real detectors have per-pixel gain variations (sensor thickness, ASIC differences, calibration
        residuals). A flat-field map multiplies the image to emulate this fixed-pattern response.</p>
      `,
    },
    {
      title: 'Add dark/background',
      body: `
        <p>An additive term models everything present without the scattered signal: dark current and
        electronic offsets of the detector, plus parasitic background scattering (air, windows, solvent
        sheet) that survives the difference signal.</p>
      `,
    },
    {
      title: 'Add noise',
      body: `
        <p>Photon counting follows Poisson statistics, so shot noise is drawn per pixel from the expected
        photon count; Gaussian readout noise is added on top. Together they set the realistic
        signal-to-noise floor of a single (or averaged) shot.</p>
      `,
    },
    {
      title: 'Add geometry uncertainty',
      body: `
        <p>Calibration is never perfect: small perturbations of the beam center, sample-detector distance,
        and detector tilt are applied to emulate geometry refinement errors and their effect on the
        recovered 1D curve.</p>
      `,
    },
    {
      title: 'Azimuthally integrate to validate closure',
      body: `
        <p>Finally the synthetic 2D image is azimuthally re-integrated back to a 1D
        ${katex.renderToString(String.raw`\Delta I(Q)`)} curve.</p>
        <br>
        <p>Comparing it against the input signal from step 1 closes the loop: differences reveal how the
        detector effects above distort the measurement and how well the reduction pipeline undoes them.</p>
      `,
    },
  ] as const;

  const workflow = [
    {
      title: 'Load Structures',
      body: `
        <p>Upload XYZ or PDB files for ground and excited states. Structures are parsed via SimEx-Lite
        <code>SampleData</code> to extract atomic numbers and positions.</p>
      `,
    },
    {
      title: 'Configure Solvent',
      body: `
        <p>Select a solvent with ${katex.renderToString(
          String.raw`(\partial S/\partial T)`,
        )} differential
        data. Set concentration to scale the solute contribution relative to the solvent background.</p>
      `,
    },
    {
      title: 'Set Pump Parameters',
      body: `
        <p>Define photon energy (eV), excess energy deposited as heat per absorption, and excitation fraction
        (${katex.renderToString(
          String.raw`\alpha(t)`,
        )}). The heat deposition is used to estimate temperature jump and solvent response amplitude.</p>
      `,
    },
    {
      title: 'Detector Geometry',
      body: `
        <p>Configure sample-detector distance and beam center. Supports European XFEL detectors with
        module layouts.</p>
      `,
    },
    {
      title: 'Compute & Analyze',
      body: `
        <p>View ${katex.renderToString(
          String.raw`\Delta I(Q)`,
        )} with separated contributions: total
        signal, scaled solute difference (${katex.renderToString(
          String.raw`\alpha \cdot \Delta I_{\text{solute}}`,
        )}),
        and solvent thermal response. Identify optimal Q-ranges for your experiment.</p>
      `,
    },
    {
      title: 'Compare & Export',
      body: `
        <p>Compare multiple simulation configurations, save results for analysis, and use predictions
        to optimize beamtime parameters.</p>
      `,
    },
  ];
</script>

<section>
  <h1 class="tracking-tight">Technical Documentation</h1>

  <p>
    Documentation of the physics, algorithms, and implementation details behind
    the SimEx-Debye Scattering Simulator.
  </p>

  <p>
    See the code repository at:
    <a
      href="https://git.xfel.eu/simulation/simex-debye/"
      target="_blank"
      rel="noopener noreferrer"
    >
      https://git.xfel.eu/simulation/simex-debye/
    </a>.
  </p>
</section>

<section>
  <div
    class="not-prose flex items-start gap-3 rounded-md border border-caution-border bg-caution-bg px-4 py-3"
  >
    <TriangleAlert class="mt-0.5 size-4 shrink-0" />
    <div>
      <p class="text-sm font-bold tracking-tight">
        Physics Simplifications
      </p>
      <ul
        class="mt-1.5 list-disc space-y-0.5 pl-4 text-sm leading-snug text-muted-foreground"
      >
        <li>
          Gas-phase / isolated-solute scattering (no cage or intermolecular
          interference)
        </li>
        <li>Independent atoms (tabulated form factors)</li>
        <li>No Debye-Waller factors or thermal motion</li>
        <li>Tabulated solvent thermal response</li>
        <li>No explicit solute-solvent structural correlation</li>
      </ul>
    </div>
  </div>

  <h2 class="text-xl font-bold tracking-tight">Simulation Details</h2>

  <h3 class="text-lg font-bold tracking-tight">
    The Debye Scattering Equation
  </h3>
  <p>
    The simulator computes scattering intensity via the Debye scattering
    equation, which provides the orientational average for isotropic samples. We
    compute <strong
      >relative orientationally averaged molecular scattering</strong
    > (up to an overall scale factor); detector and beamline prefactors are handled
    separately or not modeled.
  </p>

  <div class="flex flex-wrap items-center">
    <div class="flex-2">
      <Latex math={eqDebye} displayMode />
    </div>

    <div class="flex-1 p-4 text-xs">
      <Latex math={defsLeft} displayMode />
    </div>
    <div class="flex-1 p-4 text-xs">
      <Latex math={defsRight} displayMode />
    </div>
  </div>
</section>

<section>
  <h3 class="text-lg font-bold tracking-tight">Atomic Form Factors</h3>

  <div class="not-prose grid gap-6 md:grid-cols-2">
    <ChannelPanel label="Cromer-Mann (1968)">
      <p class="text-sm text-muted-foreground">
        4-Gaussian + constant parameterization (coefficients stored locally for
        98 elements).
      </p>
      <div class="pt-3">
        <Latex math={eqCromerMann} displayMode />
      </div>
    </ChannelPanel>

    <ChannelPanel label="Waasmaier–Kirfel (1995)">
      <p class="text-sm text-muted-foreground">
        Alternative parameterization via <code>periodictable</code> using
        <code>cromermann.fxrayatq()</code>.
      </p>
      <p class="mt-2 text-sm text-muted-foreground">
        Computes <Latex math={String.raw`f_0(Q)`} /> only (no anomalous
        <Latex math={String.raw`f'(E), f''(E)`} /> corrections). This ignores dispersion
        corrections and may be inaccurate near absorption edges or when resonant scattering
        effects are significant.
      </p>
    </ChannelPanel>
  </div>
</section>

<section>
  <h3 class="text-lg font-bold tracking-tight">
    Difference Scattering Pipeline
  </h3>

  <p>
    For pump–probe time-resolved XSS experiments, the difference signal
    <Latex math={String.raw`\Delta I(Q)`} /> combines solute structural change with
    solvent thermal response. Time dependence arises through the excitation fraction
    <Latex math={String.raw`\alpha(t)`} /> and solvent heating parameters, not structural
    evolution.
  </p>

  <div class="not-prose grid gap-6 md:grid-cols-3">
    {#each pipeline as { title, body } (title)}
      <div class="rounded-md border border-line bg-card p-4">
        <p class="text-sm font-bold tracking-tight">{title}</p>
        <div class="mt-2 text-sm text-muted-foreground [&_p]:my-0">
          <!-- Body is trusted static markdown content authored in this file. -->
          <!-- eslint-disable-next-line svelte/no-at-html-tags -->
          {@html body}
        </div>
      </div>
    {/each}
  </div>
</section>

<section>
  <h3 class="text-lg font-bold tracking-tight">
    Image Reconstruction Pipeline
  </h3>

  <p>
    We forward-simulate a 2D detector image by applying the same effects that
    are corrected during 1D reduction, then re-integrate as a consistency check.
  </p>

  <div class="not-prose grid gap-6 md:grid-cols-3">
    {#each imagePipeline as { title, body }, i (title)}
      <div class="rounded-md border border-line bg-card p-4">
        <p class="text-sm font-bold tracking-tight">{i + 1}. {title}</p>
        <div class="mt-2 text-sm text-muted-foreground [&_p]:my-0">
          <!-- Body is trusted static markdown content authored in this file. -->
          <!-- eslint-disable-next-line svelte/no-at-html-tags -->
          {@html body}
        </div>
      </div>
    {/each}
  </div>
</section>

<section>
  <h2 class="text-xl font-bold tracking-tight">Usage</h2>

  <div class="not-prose grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
    {#each workflow as item, i (item.title)}
      <div class="rounded-md border border-line bg-card p-4">
        <p class="text-sm font-bold tracking-tight">{i + 1}. {item.title}</p>
        <div class="mt-2 text-sm text-muted-foreground [&_p]:my-0">
          <!-- Body is trusted static markdown content authored in this file. -->
          <!-- eslint-disable-next-line svelte/no-at-html-tags -->
          {@html item.body}
        </div>
      </div>
    {/each}
  </div>
</section>
