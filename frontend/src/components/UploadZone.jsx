import { useState } from "react";
import { FileUp } from "lucide-react";

export default function UploadZone({ onUpload, uploading }) {
  const [dragOver, setDragOver] = useState(false);

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onUpload(file);
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={`m-8 border-2 border-dashed rule flex flex-col items-center justify-center py-16 text-center transition-colors ${
        dragOver ? "border-teal bg-teal/5" : ""
      }`}
    >
      <FileUp size={28} className="text-slate mb-3" />
      <p className="text-ink dark:text-paper mb-1">Drop a .csv or .json file here</p>
      <p className="text-xs text-slate mb-4">up to 10MB · or pick a sample dataset from the menu above</p>
      <label className="border rule px-3 py-1.5 text-sm text-ink dark:text-paper hover:bg-line/30 cursor-pointer">
        {uploading ? "Reading file…" : "browse files"}
        <input
          type="file"
          accept=".csv,.json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onUpload(file);
            e.target.value = "";
          }}
        />
      </label>
    </div>
  );
}
