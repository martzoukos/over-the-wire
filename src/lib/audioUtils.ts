/**
 * Audio utility functions for PCM audio processing
 */

export const SAMPLE_RATE = 16000; // 16kHz
export const BITS_PER_SAMPLE = 16;
export const BYTES_PER_SAMPLE = 2;

/**
 * Convert Float32Array audio samples to Int16Array PCM data
 * @param floatSamples - Audio samples in range [-1, 1]
 * @returns Int16Array with samples in range [-32768, 32767]
 */
export function floatToPCM16(floatSamples: Float32Array): Int16Array {
  const pcmSamples = new Int16Array(floatSamples.length);
  for (let i = 0; i < floatSamples.length; i++) {
    // Clamp to [-1, 1] and convert to 16-bit PCM
    const clamped = Math.max(-1, Math.min(1, floatSamples[i]));
    pcmSamples[i] = Math.round(clamped * 32767);
  }
  return pcmSamples;
}

/**
 * Convert Int16Array PCM data to Float32Array
 * @param pcmSamples - PCM samples in range [-32768, 32767]
 * @returns Float32Array with samples in range [-1, 1]
 */
export function pcm16ToFloat(pcmSamples: Int16Array): Float32Array {
  const floatSamples = new Float32Array(pcmSamples.length);
  for (let i = 0; i < pcmSamples.length; i++) {
    floatSamples[i] = pcmSamples[i] / 32767;
  }
  return floatSamples;
}

/**
 * Calculate RMS (Root Mean Square) volume level
 * @param samples - Audio samples (Float32Array or Int16Array)
 * @returns Volume level as percentage (0-100)
 */
export function calculateVolume(samples: Float32Array | Int16Array): number {
  let sum = 0;
  const maxValue = samples instanceof Float32Array ? 1 : 32767;

  for (let i = 0; i < samples.length; i++) {
    const normalizedSample = samples[i] / maxValue;
    sum += normalizedSample * normalizedSample;
  }

  const rms = Math.sqrt(sum / samples.length);
  return rms * 100;
}

/**
 * Calculate peak volume level
 * @param samples - Audio samples (Float32Array or Int16Array)
 * @returns Peak volume level as percentage (0-100)
 */
export function calculatePeakVolume(samples: Float32Array | Int16Array): number {
  let maxAmplitude = 0;
  const maxValue = samples instanceof Float32Array ? 1 : 32767;

  for (let i = 0; i < samples.length; i++) {
    maxAmplitude = Math.max(maxAmplitude, Math.abs(samples[i]));
  }

  return (maxAmplitude / maxValue) * 100;
}

/**
 * Estimate dominant frequency using zero-crossing rate
 * @param samples - Audio samples
 * @param sampleRate - Sample rate in Hz
 * @returns Estimated frequency in Hz
 */
export function estimateFrequency(samples: Float32Array | Int16Array, sampleRate: number = SAMPLE_RATE): number {
  let zeroCrossings = 0;

  for (let i = 1; i < samples.length; i++) {
    if ((samples[i] >= 0) !== (samples[i - 1] >= 0)) {
      zeroCrossings++;
    }
  }

  // Estimate frequency based on zero crossings
  return (zeroCrossings * sampleRate) / (2 * samples.length);
}

/**
 * Apply a simple low-pass filter to reduce noise
 * @param samples - Input audio samples
 * @param alpha - Filter coefficient (0-1, lower = more filtering)
 * @returns Filtered samples
 */
export function lowPassFilter(samples: Float32Array, alpha: number = 0.8): Float32Array {
  const filtered = new Float32Array(samples.length);
  filtered[0] = samples[0];

  for (let i = 1; i < samples.length; i++) {
    filtered[i] = alpha * samples[i] + (1 - alpha) * filtered[i - 1];
  }

  return filtered;
}

/**
 * Convert PCM data to WAV format
 * @param pcmSamples - PCM audio samples
 * @param sampleRate - Sample rate in Hz
 * @param numChannels - Number of audio channels
 * @returns WAV file as ArrayBuffer
 */
export function pcmToWav(
  pcmSamples: Int16Array,
  sampleRate: number = SAMPLE_RATE,
  numChannels: number = 1
): ArrayBuffer {
  const bufferLength = 44 + pcmSamples.length * 2;
  const buffer = new ArrayBuffer(bufferLength);
  const view = new DataView(buffer);

  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  // RIFF header
  writeString(0, 'RIFF');
  view.setUint32(4, bufferLength - 8, true);
  writeString(8, 'WAVE');

  // fmt chunk
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM format chunk size
  view.setUint16(20, 1, true);  // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true); // byte rate
  view.setUint16(32, numChannels * 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample

  // data chunk
  writeString(36, 'data');
  view.setUint32(40, pcmSamples.length * 2, true);

  // PCM data
  for (let i = 0; i < pcmSamples.length; i++) {
    view.setInt16(44 + i * 2, pcmSamples[i], true);
  }

  return buffer;
}

/**
 * Resample audio to a different sample rate (simple linear interpolation)
 * @param samples - Input samples
 * @param inputSampleRate - Original sample rate
 * @param outputSampleRate - Target sample rate
 * @returns Resampled audio
 */
export function resampleAudio(
  samples: Float32Array,
  inputSampleRate: number,
  outputSampleRate: number
): Float32Array {
  if (inputSampleRate === outputSampleRate) {
    return samples;
  }

  const ratio = inputSampleRate / outputSampleRate;
  const outputLength = Math.floor(samples.length / ratio);
  const resampled = new Float32Array(outputLength);

  for (let i = 0; i < outputLength; i++) {
    const inputIndex = i * ratio;
    const lowerIndex = Math.floor(inputIndex);
    const upperIndex = Math.min(lowerIndex + 1, samples.length - 1);
    const fraction = inputIndex - lowerIndex;

    // Linear interpolation
    resampled[i] = samples[lowerIndex] * (1 - fraction) + samples[upperIndex] * fraction;
  }

  return resampled;
}

/**
 * Check if the browser supports AudioWorklet
 * @returns True if AudioWorklet is supported
 */
export function supportsAudioWorklet(): boolean {
  return typeof AudioWorklet !== 'undefined' && typeof AudioContext !== 'undefined';
}

/**
 * Create an audio context with the specified sample rate
 * @param sampleRate - Desired sample rate
 * @returns AudioContext or null if not supported
 */
export function createAudioContext(sampleRate: number = SAMPLE_RATE): AudioContext | null {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) {
      return null;
    }

    return new AudioContextClass({ sampleRate });
  } catch (error) {
    console.error('Failed to create AudioContext:', error);
    return null;
  }
}

/**
 * Format audio duration from samples to human-readable string
 * @param samples - Number of samples
 * @param sampleRate - Sample rate in Hz
 * @returns Formatted duration string (e.g., "1.5s", "123ms")
 */
export function formatDuration(samples: number, sampleRate: number = SAMPLE_RATE): string {
  const durationMs = (samples / sampleRate) * 1000;

  if (durationMs >= 1000) {
    return `${(durationMs / 1000).toFixed(1)}s`;
  } else {
    return `${durationMs.toFixed(0)}ms`;
  }
}
