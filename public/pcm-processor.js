class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 0;
    this.buffer = new Float32Array(4096); // Buffer for accumulating samples
    this.bufferIndex = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];

    if (input.length > 0) {
      const inputChannel = input[0]; // Get first channel (mono)

      if (inputChannel) {
        // Accumulate samples in buffer
        for (let i = 0; i < inputChannel.length; i++) {
          this.buffer[this.bufferIndex] = inputChannel[i];
          this.bufferIndex++;

          // When buffer is full, send PCM data to main thread
          if (this.bufferIndex >= this.buffer.length) {
            // Create a copy of the buffer to send
            const pcmData = new Float32Array(this.buffer);
            this.port.postMessage(pcmData);

            // Reset buffer
            this.bufferIndex = 0;
          }
        }
      }
    }

    // Return true to keep the processor alive
    return true;
  }
}

registerProcessor('pcm-processor', PCMProcessor);
