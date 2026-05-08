/** `custom` opts into the FFT + canvas pipeline; otherwise WaveSurfer Spectrogram plugin is used (default demo path). */
export const USE_CUSTOM_SPECTROGRAM_RENDERER =
  import.meta.env.VITE_COMPARE_SPECTROGRAM_RENDERER === 'custom';
