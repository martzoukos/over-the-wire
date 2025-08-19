import { useState, useEffect, useRef } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { pcm16ToFloat, calculateVolume, SAMPLE_RATE } from "../lib/audioUtils";
import { Play, Square, Volume2, VolumeX, Wifi, WifiOff } from "lucide-react";

interface ConnectionsProps {
  isRecording?: boolean;
  websocketConnection: React.MutableRefObject<WebSocket | null>;
}

export default function Connections({
  isRecording,
  websocketConnection,
}: ConnectionsProps) {
  const [websocketUrl, setWebsocketUrl] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string>("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [playbackStatus, setPlaybackStatus] = useState<string>("");

  // Audio playback refs
  const audioContext = useRef<AudioContext | null>(null);
  const audioQueue = useRef<Float32Array[]>([]);
  const isPlaybackActive = useRef(false);
  const nextPlayTime = useRef(0);

  const connectToWebsocket = () => {
    if (!websocketUrl.trim()) {
      setConnectionStatus("Please enter a WebSocket URL");
      return;
    }

    try {
      // Close existing connection if any
      if (websocketConnection.current) {
        websocketConnection.current.close();
      }

      setConnectionStatus("Connecting...");
      websocketConnection.current = new WebSocket(websocketUrl);

      websocketConnection.current.onopen = () => {
        setIsConnected(true);
        setConnectionStatus("Connected");
        console.log("WebSocket connected to:", websocketUrl);
      };

      websocketConnection.current.onclose = () => {
        setIsConnected(false);
        setConnectionStatus("Disconnected");
        stopAudioPlayback();
        console.log("WebSocket disconnected");
      };

      websocketConnection.current.onerror = (error) => {
        setIsConnected(false);
        setConnectionStatus("Connection error");
        stopAudioPlayback();
        console.error("WebSocket error:", error);
      };

      websocketConnection.current.onmessage = (event) => {
        // Handle both binary PCM data and text messages
        if (event.data instanceof ArrayBuffer) {
          handlePCMData(event.data);
        } else {
          console.log("Received text message from WebSocket:", event.data);
        }
      };
    } catch (error) {
      setConnectionStatus("Invalid URL");
      console.error("WebSocket connection error:", error);
    }
  };

  const disconnectWebsocket = () => {
    if (websocketConnection.current) {
      websocketConnection.current.close();
      websocketConnection.current = null;
    }
    stopAudioPlayback();
  };

  const handlePCMData = (arrayBuffer: ArrayBuffer) => {
    if (!isPlaying) return;

    try {
      // Convert ArrayBuffer to Int16Array (PCM data)
      const pcmSamples = new Int16Array(arrayBuffer);

      // Convert PCM to Float32Array for Web Audio API
      const floatSamples = pcm16ToFloat(pcmSamples);

      // Calculate volume level for UI indicator
      const volume = calculateVolume(floatSamples);
      setVolumeLevel(volume);

      // Add to audio queue for playback
      audioQueue.current.push(floatSamples);

      console.log(
        `Received PCM audio: ${pcmSamples.length} samples, volume: ${volume.toFixed(1)}%`,
      );

      // Process audio queue if not already processing
      if (!isPlaybackActive.current) {
        processAudioQueue();
      }
    } catch (error) {
      console.error("Error processing PCM data:", error);
    }
  };

  const initializeAudioContext = async () => {
    try {
      audioContext.current = new AudioContext({ sampleRate: SAMPLE_RATE });

      // Resume context if suspended (required by some browsers)
      if (audioContext.current.state === "suspended") {
        await audioContext.current.resume();
      }

      nextPlayTime.current = audioContext.current.currentTime;
      setPlaybackStatus("Audio context initialized");
      return true;
    } catch (error) {
      console.error("Failed to initialize audio context:", error);
      setPlaybackStatus("Audio initialization failed");
      return false;
    }
  };

  const processAudioQueue = async () => {
    if (!audioContext.current || isPlaybackActive.current) return;

    isPlaybackActive.current = true;
    setPlaybackStatus("Playing audio");

    const processChunk = () => {
      if (
        !isPlaying ||
        !audioContext.current ||
        audioQueue.current.length === 0
      ) {
        isPlaybackActive.current = false;
        setPlaybackStatus(isPlaying ? "Waiting for audio data" : "Stopped");
        setVolumeLevel(0);
        return;
      }

      const audioData = audioQueue.current.shift();
      if (!audioData) {
        setTimeout(processChunk, 10); // Check again soon
        return;
      }

      try {
        // Create audio buffer
        const audioBuffer = audioContext.current.createBuffer(
          1, // mono
          audioData.length,
          SAMPLE_RATE,
        );

        // Copy audio data to buffer
        audioBuffer.getChannelData(0).set(audioData);

        // Create buffer source
        const source = audioContext.current.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.current.destination);

        // Schedule playback
        source.start(nextPlayTime.current);

        // Update next play time
        const chunkDuration = audioData.length / SAMPLE_RATE;
        nextPlayTime.current += chunkDuration;

        // Ensure we don't fall behind real-time
        const currentTime = audioContext.current.currentTime;
        if (nextPlayTime.current < currentTime) {
          nextPlayTime.current = currentTime;
        }

        // Schedule next chunk
        setTimeout(processChunk, (chunkDuration * 1000) / 2); // Process next chunk halfway through current
      } catch (error) {
        console.error("Error playing audio chunk:", error);
        setTimeout(processChunk, 100); // Retry after brief delay
      }
    };

    processChunk();
  };

  const startAudioPlayback = async () => {
    if (!isConnected) {
      setPlaybackStatus("Not connected to WebSocket");
      return;
    }

    const initialized = await initializeAudioContext();
    if (!initialized) return;

    setIsPlaying(true);
    audioQueue.current = []; // Clear any old audio data
    setPlaybackStatus("Ready to play incoming audio");
  };

  const stopAudioPlayback = () => {
    setIsPlaying(false);
    isPlaybackActive.current = false;
    audioQueue.current = [];
    setVolumeLevel(0);
    setPlaybackStatus("");

    // Close audio context
    if (audioContext.current) {
      audioContext.current.close();
      audioContext.current = null;
    }
  };

  // Clean up WebSocket connection and audio on unmount
  useEffect(() => {
    return () => {
      if (websocketConnection.current) {
        websocketConnection.current.close();
      }
      stopAudioPlayback();
    };
  }, [websocketConnection]);

  // Volume level display with bar indicator
  const getVolumeColor = (level: number) => {
    if (level < 20) return "bg-green-500";
    if (level < 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span>Websocket URL:</span>
        <Input
          type="text"
          value={websocketUrl}
          placeholder="ws://websocket.example.com"
          onChange={(e) => setWebsocketUrl(e.target.value)}
          disabled={isConnected}
        />
        {isConnected ? (
          <Button variant="destructive" onClick={disconnectWebsocket}>
            <WifiOff className="w-4 h-4 mr-1" />
            Disconnect
          </Button>
        ) : (
          <Button onClick={connectToWebsocket}>
            <Wifi className="w-4 h-4 mr-1" />
            Connect
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <span>Status:</span>
        <span
          className={`text-sm ${
            isConnected
              ? "text-green-600"
              : connectionStatus.includes("error") ||
                  connectionStatus.includes("Invalid")
                ? "text-red-600"
                : "text-gray-600"
          }`}
        >
          {connectionStatus || "Not connected"}
        </span>
        {isConnected && isRecording && (
          <span className="text-sm text-blue-600">• Streaming audio</span>
        )}
      </div>

      {/* Audio Playback Controls */}
      <div className="flex flex-col gap-2 border-t pt-2">
        <div className="flex items-center gap-2">
          <span>Audio Playback:</span>
          {isPlaying ? (
            <Button variant="destructive" size="sm" onClick={stopAudioPlayback}>
              <Square className="w-3 h-3 mr-1" />
              Stop Playing
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={startAudioPlayback}
              disabled={!isConnected}
            >
              <Play className="w-3 h-3 mr-1" />
              Start Playing
            </Button>
          )}
          {isPlaying && (
            <span className="text-sm text-green-600 flex items-center gap-1">
              <Volume2 className="w-3 h-3" />
              Playing incoming audio
            </span>
          )}
        </div>

        {/* Volume Level Indicator */}
        {isPlaying && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              {volumeLevel > 5 ? (
                <Volume2 className="w-3 h-3 text-gray-600" />
              ) : (
                <VolumeX className="w-3 h-3 text-gray-400" />
              )}
              <span className="text-sm">Volume:</span>
            </div>
            <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-32">
              <div
                className={`h-2 rounded-full transition-all duration-100 ${getVolumeColor(volumeLevel)}`}
                style={{ width: `${Math.min(volumeLevel, 100)}%` }}
              />
            </div>
            <span className="text-xs text-gray-600 min-w-10">
              {volumeLevel.toFixed(0)}%
            </span>
          </div>
        )}

        {/* Playback Status */}
        {playbackStatus && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 italic">
              {playbackStatus}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
