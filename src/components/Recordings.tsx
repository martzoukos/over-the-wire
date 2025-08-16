import { MIME_TYPE } from "@/App";
import { clearRecordings, type IDBRecording } from "@/lib/indexedDB";
import { Button } from "./ui/button";
import { saveToFile } from "@/lib/saveToFile";
import ErrorBoundary from "./ErrorBoundary";
import { useRecordings } from "@/lib/useRecordings";
import { useEffect } from "react";

export default function Recordings({
  refreshTrigger,
}: {
  refreshTrigger?: number;
}) {
  const { recordings, loading, error, removeRecording, refreshRecordings } =
    useRecordings();

  // Refresh recordings when trigger changes
  useEffect(() => {
    if (refreshTrigger !== undefined) {
      refreshRecordings();
    }
  }, [refreshTrigger, refreshRecordings]);

  const handleDelete = async (id: string) => {
    try {
      await removeRecording(id);
      alert("Recording deleted!");
    } catch (err) {
      console.error("Failed to delete recording:", err);
      alert("Failed to delete recording!");
    }
  };

  if (loading) {
    return <div>Loading recordings...</div>;
  }

  if (error) {
    return <div>Error loading recordings: {error}</div>;
  }

  return (
    <ErrorBoundary onClearData={clearRecordings}>
      <div>
        {recordings.map((recording, index) => (
          <Recording
            key={index}
            recording={recording}
            onDelete={handleDelete}
          />
        ))}
        {recordings.length === 0 && (
          <div className="text-gray-500">No recordings yet</div>
        )}
      </div>
    </ErrorBoundary>
  );
}

const Recording = ({
  recording,
  onDelete,
}: {
  recording: IDBRecording;
  onDelete: (id: string) => void;
}) => {
  const recordingBlob = new Blob(recording.blobs, { type: MIME_TYPE });

  const handleSave = async () => {
    await saveToFile(recording.blobs, {
      filename: `${recording.id}.webm`,
      mime: MIME_TYPE,
    });
    alert("Recording saved!");
  };

  return (
    <div className="flex items-center gap-2.5">
      {recording.id}
      <audio controls src={URL.createObjectURL(recordingBlob)} />
      <Button variant="secondary" onClick={handleSave}>
        Save
      </Button>
      <Button variant="destructive" onClick={() => onDelete(recording.id)}>
        Delete
      </Button>
    </div>
  );
};
