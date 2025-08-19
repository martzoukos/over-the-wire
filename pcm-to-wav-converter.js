const fs = require('fs');

/**
 * Utility to convert raw PCM data to WAV format
 * Usage: node pcm-to-wav-converter.js input.raw output.wav [sampleRate] [channels]
 */

function pcmToWav(pcmBuffer, sampleRate = 16000, numChannels = 1, bitsPerSample = 16) {
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = pcmBuffer.length;
  const fileSize = 44 + dataSize;

  // Create WAV header
  const header = Buffer.alloc(44);
  let offset = 0;

  // RIFF header
  header.write('RIFF', offset); offset += 4;
  header.writeUInt32LE(fileSize - 8, offset); offset += 4;
  header.write('WAVE', offset); offset += 4;

  // fmt chunk
  header.write('fmt ', offset); offset += 4;
  header.writeUInt32LE(16, offset); offset += 4; // PCM chunk size
  header.writeUInt16LE(1, offset); offset += 2;  // PCM format
  header.writeUInt16LE(numChannels, offset); offset += 2;
  header.writeUInt32LE(sampleRate, offset); offset += 4;
  header.writeUInt32LE(byteRate, offset); offset += 4;
  header.writeUInt16LE(blockAlign, offset); offset += 2;
  header.writeUInt16LE(bitsPerSample, offset); offset += 2;

  // data chunk
  header.write('data', offset); offset += 4;
  header.writeUInt32LE(dataSize, offset);

  // Combine header and data
  return Buffer.concat([header, pcmBuffer]);
}

function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log('Usage: node pcm-to-wav-converter.js <input.raw> <output.wav> [sampleRate] [channels]');
    console.log('');
    console.log('Examples:');
    console.log('  node pcm-to-wav-converter.js recording.raw recording.wav');
    console.log('  node pcm-to-wav-converter.js recording.raw recording.wav 16000 1');
    console.log('  node pcm-to-wav-converter.js recording.raw recording.wav 44100 2');
    console.log('');
    console.log('Parameters:');
    console.log('  input.raw    - Raw PCM input file (16-bit signed integers)');
    console.log('  output.wav   - Output WAV file');
    console.log('  sampleRate   - Sample rate in Hz (default: 16000)');
    console.log('  channels     - Number of channels (default: 1)');
    process.exit(1);
  }

  const inputFile = args[0];
  const outputFile = args[1];
  const sampleRate = parseInt(args[2]) || 16000;
  const channels = parseInt(args[3]) || 1;

  try {
    console.log(`Converting ${inputFile} to ${outputFile}`);
    console.log(`Sample rate: ${sampleRate} Hz`);
    console.log(`Channels: ${channels}`);

    // Read raw PCM data
    const pcmData = fs.readFileSync(inputFile);
    console.log(`Input file size: ${pcmData.length} bytes`);

    // Calculate audio duration
    const bytesPerSample = 2; // 16-bit = 2 bytes
    const totalSamples = pcmData.length / (bytesPerSample * channels);
    const durationSeconds = totalSamples / sampleRate;
    console.log(`Audio duration: ${durationSeconds.toFixed(2)} seconds`);

    // Convert to WAV
    const wavData = pcmToWav(pcmData, sampleRate, channels);

    // Write WAV file
    fs.writeFileSync(outputFile, wavData);

    console.log(`✓ Successfully converted to ${outputFile}`);
    console.log(`Output file size: ${wavData.length} bytes`);

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Export function for use as module
module.exports = { pcmToWav };

// Run as script if called directly
if (require.main === module) {
  main();
}
