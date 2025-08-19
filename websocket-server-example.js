const WebSocket = require("ws");
const fs = require("fs");

// Create WebSocket server on port 8080
const wss = new WebSocket.Server({ port: 8080 });

console.log("WebSocket server started on ws://localhost:8080");

wss.on("connection", function connection(ws) {
  console.log("New client connected");
  let audioFileStream = null;
  let sampleCount = 0;

  // Send welcome message
  ws.send("Connected to 16kHz PCM audio streaming server");

  // Handle incoming messages (PCM audio data)
  ws.on("message", function incoming(data) {
    // Data is 16-bit PCM samples at 16kHz
    const samples = new Int16Array(data);
    console.log(
      `Received PCM data: ${samples.length} samples (${data.byteLength} bytes)`,
    );

    sampleCount += samples.length;
    const durationMs = (sampleCount / 16000) * 1000; // Calculate duration
    console.log(`Total audio duration: ${durationMs.toFixed(1)}ms`);

    // Example: Save PCM data to WAV file (uncomment if needed)
    // if (!audioFileStream) {
    //   audioFileStream = fs.createWriteStream('received_audio.raw');
    // }
    // audioFileStream.write(Buffer.from(data));

    // Example: Process PCM samples
    // You can analyze audio levels, frequencies, etc.
    let maxAmplitude = 0;
    for (let i = 0; i < samples.length; i++) {
      maxAmplitude = Math.max(maxAmplitude, Math.abs(samples[i]));
    }
    const volumeLevel = (maxAmplitude / 32767) * 100;

    // Echo back audio info (optional)
    ws.send(
      JSON.stringify({
        type: "audio_info",
        samples: samples.length,
        bytes: data.byteLength,
        volumeLevel: volumeLevel.toFixed(1),
        totalDurationMs: durationMs.toFixed(1),
      }),
    );
  });

  // Handle client disconnect
  ws.on("close", function close() {
    console.log("Client disconnected");
  });

  // Handle errors
  ws.on("error", function error(err) {
    console.error("WebSocket error:", err);
  });
});

// Handle server errors
wss.on("error", function error(err) {
  console.error("Server error:", err);
});

console.log("To test:");
console.log("1. Run: node websocket-server-example.js");
console.log("2. Open your app and connect to ws://localhost:8080");
console.log("3. Start recording to see audio chunks being received");
