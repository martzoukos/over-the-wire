export async function saveToFile(
  chunks: Blob[],
  opts?: { mime?: string; filename?: string },
) {
  const mime = opts?.mime ?? "audio/webm";
  const filename = opts?.filename ?? "recording.webm";

  if ("showSaveFilePicker" in window) {
    const ext = mime.includes("ogg") ? ".ogg" : ".webm";
    const acceptType = mime.includes("ogg") ? "audio/ogg" : "audio/webm";

    // @ts-expect-error TS doesn't know this API on all libs
    const handle = await window.showSaveFilePicker({
      suggestedName: filename.endsWith(ext)
        ? filename
        : filename.replace(/\.\w+$/, "") + ext,
      types: [{ description: "Audio", accept: { [acceptType]: [ext] } }],
    });

    const writable = await handle.createWritable();
    for (const chunk of chunks) await writable.write(chunk);
    await writable.close();
    return { method: "fs-picker" as const };
  }

  // Cross-browser fallback: object URL download
  const blob = new Blob(chunks, { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
  return { method: "download" as const };
}
