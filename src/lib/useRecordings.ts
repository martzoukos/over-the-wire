import { useState, useEffect, useCallback } from 'react';
import { getAllRecordings, deleteRecording, type IDBRecording } from './indexedDB';

export function useRecordings() {
  const [recordings, setRecordings] = useState<IDBRecording[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecordings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const recs = await getAllRecordings();
      setRecordings(recs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch recordings');
      console.error('Error fetching recordings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const removeRecording = useCallback(async (id: string) => {
    try {
      await deleteRecording(id);
      // Update local state by filtering out the deleted recording
      setRecordings(prev => prev.filter(recording => recording.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete recording');
      console.error('Error deleting recording:', err);
      throw err; // Re-throw to let the component handle it
    }
  }, []);

  const refreshRecordings = useCallback(() => {
    fetchRecordings();
  }, [fetchRecordings]);

  useEffect(() => {
    fetchRecordings();
  }, [fetchRecordings]);

  return {
    recordings,
    loading,
    error,
    refreshRecordings,
    removeRecording,
  };
}
