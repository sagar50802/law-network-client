import React, { useState } from "react";
import axios from "axios";

export default function PdfDemo() {
  const [file, setFile] = useState(null);
  const [filename, setFilename] = useState("");

  const handleUpload = async () => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await axios.post(
      "https://law-network.onrender.com/api/gridfs/upload",
      formData
    );
    setFilename(res.data.filename);
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>PDF GridFS Demo</h2>
      <input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files[0])} />
      <button onClick={handleUpload}>Upload PDF</button>

      {filename && (
        <div style={{ marginTop: "20px" }}>
          <h3>Preview:</h3>
          <iframe
            src={`https://law-network.onrender.com/api/gridfs/file/${filename}`}
            width="600"
            height="500"
            title="pdf"
          />
        </div>
      )}
    </div>
  );
}
