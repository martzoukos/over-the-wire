# WebSocket Audio Streaming

This application now supports real-time audio streaming via WebSocket connections. When recording audio, the app can simultaneously stream audio data to a WebSocket server in high-quality PCM format. Additionally, the app can receive and play back PCM audio data from WebSocket servers in real-time.

## Features

- Real-time 16kHz PCM audio streaming during recording
- **Real-time PCM audio playback from WebSocket servers**
- WebSocket connection management with status indicators
- Binary audio data transmission (16-bit PCM format)
- Dual recording: WebM files saved locally + PCM streaming
- Automatic reconnection handling
- Visual connection status feedback
- **Audio playback controls with volume indicators**
- **Live volume level visualization during playback**

## How It Works

### Audio Streaming (Outbound)
1. **Connect to WebSocket**: Enter a WebSocket URL and click "Connect"
2. **Start Recording**: Begin audio recording as usual
3. **Dual Processing**: 
   - WebM chunks saved to IndexedDB for local file recording
   - Raw PCM data (16kHz, 16-bit) streamed to WebSocket in real-time
4. **Real-time Feedback**: See connection status and streaming indicators

### Audio Playback (Inbound)
1. **Connect to WebSocket**: Establish connection as above
2. **Start Audio Playback**: Click "Start Playing" to enable incoming audio playback
3. **Real-time Playback**: 
   - Incoming PCM data is automatically converted and played through speakers
   - Live volume level indicator shows audio activity
   - Web Audio API provides low-latency playback
4. **Playback Controls**: Stop/start playback independently of recording

## Usage

### 1. Setting up a WebSocket Server

You can use the provided example server:

```bash
# Install ws dependency
npm install ws

# Run the example server
node websocket-server-example.js
```

This will start a WebSocket server on `ws://localhost:8080`.

### 2. Connecting from the App

1. Enter the WebSocket URL: `ws://localhost:8080`
2. Click "Connect"
3. Wait for "Connected" status
4. Start recording - audio will stream automatically

### 3. Audio Data Format

- **Format**: 16kHz, 16-bit PCM (uncompressed)
- **Sample Rate**: 16,000 Hz (16kHz)
- **Bit Depth**: 16-bit signed integers
- **Channels**: Mono (single channel)
- **Transmission**: Binary data (Int16Array as ArrayBuffer)
- **Buffer Size**: 4096 samples per chunk (~256ms at 16kHz)

## WebSocket Server Implementation

Your WebSocket server should handle binary PCM messages:

```javascript
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', function connection(ws) {
  ws.on('message', function incoming(data) {
    // data is an ArrayBuffer containing 16-bit PCM samples
    const samples = new Int16Array(data);
    console.log(`Received PCM data: ${samples.length} samples (${data.byteLength} bytes)`);
    
    // Process PCM audio data here:
    // - Real-time speech recognition
    // - Audio analysis (volume, frequency)
    // - Save as WAV/raw PCM file
    // - Forward to audio processing service
    
    // Example: Calculate volume level
    let maxAmplitude = 0;
    for (let i = 0; i < samples.length; i++) {
      maxAmplitude = Math.max(maxAmplitude, Math.abs(samples[i]));
    }
    const volumeLevel = (maxAmplitude / 32767) * 100;
    console.log(`Volume level: ${volumeLevel.toFixed(1)}%`);
  });
});
```

## Status Indicators

### Connection Status
- **Not connected**: Gray text, no connection
- **Connecting...**: Gray text, attempting connection
- **Connected**: Green text, ready to stream
- **Connection error**: Red text, connection failed
- **• Streaming audio**: Blue text, actively streaming during recording

### Audio Playback Status
- **Playing incoming audio**: Green text with volume icon, actively playing
- **Volume level bar**: Real-time visualization of incoming audio levels
  - Green: Low volume (0-20%)
  - Yellow: Medium volume (20-60%)
  - Red: High volume (60%+)
- **Playback status messages**: "Ready to play", "Playing audio", "Waiting for audio data"

## Troubleshooting

### Connection Issues

1. **Invalid URL**: Ensure URL starts with `ws://` or `wss://`
2. **Server not running**: Make sure your WebSocket server is active
3. **Firewall/Network**: Check network connectivity and firewall settings
4. **CORS Issues**: For browser-based servers, ensure proper CORS configuration

### Audio Streaming Issues (Outbound)

1. **No audio chunks**: Ensure recording is active and microphone permissions are granted
2. **Large chunks**: Consider reducing chunk duration for more frequent streaming
3. **Connection drops**: Check network stability and server error handling

### Audio Playback Issues (Inbound)

1. **No audio playing**: 
   - Ensure "Start Playing" is clicked
   - Check browser audio permissions
   - Verify server is sending PCM data
2. **Audio lag/glitches**: 
   - Check network latency and stability
   - Ensure consistent PCM data format (16kHz, 16-bit mono)
3. **Volume too low/high**: 
   - Check system volume settings
   - Verify PCM data amplitude levels
4. **Audio context errors**: 
   - Try refreshing the page
   - Check browser audio support

## Integration Examples

### Real-time Transcription
```javascript
ws.on('message', async function(data) {
  const pcmSamples = new Int16Array(data);
  // Convert PCM to format expected by speech service
  const audioBuffer = convertPCMToWAV(pcmSamples, 16000);
  const transcript = await speechToText(audioBuffer);
  ws.send(JSON.stringify({ transcript }));
});
```

### Audio Echo/Relay Server
```javascript
const clients = new Set();

wss.on('connection', function connection(ws) {
  clients.add(ws);
  
  ws.on('message', function incoming(data) {
    // Relay PCM audio to all other connected clients
    clients.forEach(client => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(data); // Forward PCM data to other clients
      }
    });
  });
  
  ws.on('close', function() {
    clients.delete(ws);
  });
});
```

### Real-time Audio Processing & Playback
```javascript
ws.on('message', function(data) {
  const pcmSamples = new Int16Array(data);
  
  // Process audio (e.g., apply effects, noise reduction)
  const processedSamples = applyAudioEffects(pcmSamples);
  
  // Send processed audio back to client for playback
  ws.send(processedSamples.buffer);
});

function applyAudioEffects(samples) {
  // Example: Simple amplitude adjustment
  const processed = new Int16Array(samples.length);
  const gain = 0.8; // Reduce volume by 20%
  
  for (let i = 0; i < samples.length; i++) {
    processed[i] = Math.round(samples[i] * gain);
  }
  
  return processed;
}
```

### Audio Recording Server (Raw PCM)
```javascript
const fs = require('fs');
let audioFile;

ws.on('message', function(data) {
  if (!audioFile) {
    audioFile = fs.createWriteStream('recording.raw');
  }
  audioFile.write(Buffer.from(data));
});
```

### Convert PCM to WAV
```javascript
function convertPCMToWAV(pcmSamples, sampleRate) {
  const buffer = new ArrayBuffer(44 + pcmSamples.length * 2);
  const view = new DataView(buffer);
  
  // WAV header
  const writeString = (offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };
  
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + pcmSamples.length * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM format
  view.setUint16(20, 1, true);  // Linear PCM
  view.setUint16(22, 1, true);  // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, pcmSamples.length * 2, true);
  
  // PCM data
  for (let i = 0; i < pcmSamples.length; i++) {
    view.setInt16(44 + i * 2, pcmSamples[i], true);
  }
  
  return buffer;
}
```

### Audio Analysis
```javascript
ws.on('message', function(data) {
  const samples = new Int16Array(data);
  
  // Calculate RMS volume
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    sum += samples[i] * samples[i];
  }
  const rms = Math.sqrt(sum / samples.length);
  const volumeLevel = (rms / 32767) * 100;
  
  // Simple frequency analysis (count zero crossings)
  let zeroCrossings = 0;
  for (let i = 1; i < samples.length; i++) {
    if ((samples[i] >= 0) !== (samples[i-1] >= 0)) {
      zeroCrossings++;
    }
  }
  const estimatedFreq = (zeroCrossings * 16000) / (2 * samples.length);
  
  console.log('Volume level:', volumeLevel.toFixed(1));
  console.log('Estimated dominant frequency:', estimatedFreq.toFixed(1), 'Hz');
});
```

## Security Considerations

- Use `wss://` (WebSocket Secure) for production
- Implement authentication if needed
- Validate incoming data size and format
- Rate limit connections to prevent abuse
- Consider audio data privacy and encryption

## Performance Tips

- **Buffer Size**: Default 4096 samples (~256ms) balances latency and efficiency
- **Sample Rate**: 16kHz is optimal for speech recognition while keeping data size manageable
- **Network**: PCM streaming requires ~32KB/s bandwidth (16kHz × 2 bytes/sample)
- **Processing**: Consider downsampling if your application doesn't need full 16kHz quality
- **Memory**: Monitor memory usage when buffering large amounts of PCM data
- **Latency**: Smaller buffer sizes reduce latency but increase processing overhead

## Technical Details

### AudioWorklet vs ScriptProcessor
- **AudioWorklet**: Modern, preferred method with better performance
- **ScriptProcessor**: Fallback for older browsers (deprecated but compatible)
- The app automatically detects support and uses the best available method

### Data Flow

#### Outbound Audio (Recording & Streaming)
1. Microphone → MediaStream
2. MediaStream → AudioContext (16kHz)
3. AudioContext → AudioWorklet/ScriptProcessor
4. Raw PCM samples → WebSocket (binary)
5. Parallel: MediaRecorder → WebM chunks → IndexedDB

#### Inbound Audio (Playback)
1. WebSocket → Binary PCM data (ArrayBuffer)
2. ArrayBuffer → Int16Array → Float32Array conversion
3. Float32Array → AudioBuffer (Web Audio API)
4. AudioBuffer → AudioBufferSourceNode → Speakers
5. Parallel: Volume level calculation → UI indicators

### Audio Playback Implementation
- **Low-latency playback**: Uses Web Audio API for minimal delay
- **Buffer management**: Queues incoming audio chunks for smooth playback
- **Real-time processing**: Converts PCM data on-the-fly without blocking
- **Volume monitoring**: Calculates RMS volume levels for visual feedback
- **Automatic timing**: Schedules audio playback to prevent gaps or overlaps