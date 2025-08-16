import { useRef, useState, useEffect } from "react";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardHeader } from "./components/ui/card";
import { Input } from "./components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./components/ui/select";
import { addChunksToRecording, createRecording } from "./lib/indexedDB";
import Recordings from "./components/Recordings";
import { v4 as uuidv4 } from "uuid";

export const MIME_TYPE = "audio/webm";

function App() {
  const [chunkDuration, setChunkDuration] = useState<string>("");
  const mediaStream = useRef<MediaStream | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const recordingBuffer = useRef<Blob[]>([]);
  const recordingId = useRef<string>("");
  const [isRecording, setIsRecording] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const BUFFER_FLUSH_LIMIT = 10; // Save to indexeddb when buffer reaches this limit

  const triggerRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  useEffect(() => {
    const getAudioDevices = async () => {
      try {
        // Request permission first
        await navigator.mediaDevices.getUserMedia({ audio: true });

        // Get all devices
        const devices = await navigator.mediaDevices.enumerateDevices();

        // Filter for audio input devices
        const audioInputDevices = devices.filter(
          (device) => device.kind === "audioinput",
        );

        setAudioDevices(audioInputDevices);

        // Set default device if available
        if (audioInputDevices.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(audioInputDevices[0].deviceId);
        }
      } catch (error) {
        console.error("Error getting audio devices:", error);
      }
    };

    getAudioDevices();
  }, [selectedDeviceId]);

  const startRecording = async () => {
    // Create stream with selected audio device as source
    const constraints = {
      audio: selectedDeviceId ? { deviceId: selectedDeviceId } : true,
    };

    mediaStream.current =
      await navigator.mediaDevices.getUserMedia(constraints);

    // Create MediaRecorder instance with stream
    mediaRecorder.current = new MediaRecorder(mediaStream.current);

    // Start recording
    mediaRecorder.current.start(
      chunkDuration ? Number(chunkDuration) : undefined,
    );

    mediaRecorder.current.onstart = () => {
      setIsRecording(true);
      // Create the recording object with the current timestamp and an empty array of chunks
      recordingId.current = uuidv4();
      createRecording(recordingId.current, []).then(() => {
        triggerRefresh();
      });
    };

    // On each blob chunk add it to the buffer and if it's time to save to indexeddb, store it
    mediaRecorder.current.ondataavailable = (event) => {
      console.log("Blob chunk received:", event.data);
      if (event.data.size > 0) {
        recordingBuffer.current.push(event.data);
        console.log("recordingBuffer:", recordingBuffer);
        if (recordingBuffer.current.length >= BUFFER_FLUSH_LIMIT) {
          addChunksToRecording(recordingId.current, recordingBuffer.current);
          recordingBuffer.current = [];
        }
      }
    };

    // On stop, flush the remaining chunks, if any
    mediaRecorder.current.onstop = () => {
      if (recordingBuffer.current.length > 0) {
        addChunksToRecording(recordingId.current, recordingBuffer.current).then(
          () => {
            triggerRefresh();
          },
        );
        recordingBuffer.current = [];
      }
      setIsRecording(false);
    };
  };

  const stopRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state === "recording") {
      mediaRecorder.current.stop();
    }
  };

  const pauseRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state === "recording") {
      mediaRecorder.current.pause();
    }
  };

  const resumeRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state === "paused") {
      mediaRecorder.current.resume();
    }
  };

  return (
    <div className="w-full h-full flex flex-col gap-5 items-center p-5">
      <Card className="w-full max-w-lg">
        <CardContent className="flex flex-col gap-5">
          <div className="flex items-center gap-2">
            <span>Audio loop duration (ms):</span>
            <Input
              className="w-24"
              type="number"
              disabled={isRecording}
              value={chunkDuration}
              placeholder="100ms"
              onChange={(e) => setChunkDuration(e.target.value)}
            />
            <Button
              variant="ghost"
              disabled={isRecording}
              onClick={() => {
                setChunkDuration("");
              }}
            >
              Clear
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <span>Input source:</span>
            <Select
              value={selectedDeviceId}
              disabled={isRecording}
              onValueChange={(value) => setSelectedDeviceId(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Theme" />
              </SelectTrigger>
              <SelectContent>
                {audioDevices.map((device) => (
                  <SelectItem key={device.deviceId} value={device.deviceId}>
                    {device.label ||
                      `Audio Device ${device.deviceId.slice(0, 8)}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            Record audio
            <Button
              className="m-2"
              onClick={startRecording}
              disabled={isRecording}
            >
              Start
            </Button>
            <Button
              className="m-2"
              onClick={stopRecording}
              disabled={!isRecording}
            >
              Stop
            </Button>
            <Button
              className="m-2"
              onClick={pauseRecording}
              disabled={!isRecording}
            >
              Pause
            </Button>
            <Button
              className="m-2"
              onClick={resumeRecording}
              disabled={!isRecording}
            >
              Resume
            </Button>
          </div>
        </CardContent>
      </Card>
      <Card className="w-full max-w-lg">
        <CardHeader>Recordings:</CardHeader>
        <CardContent>
          <Recordings refreshTrigger={refreshTrigger} />
        </CardContent>
      </Card>
    </div>
  );
}

export default App;
