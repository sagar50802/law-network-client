import React, { useState, useEffect } from "react";
import axios from "axios";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Configure worker for react-pdf
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

export default function PdfDemo() {
  const [file, setFile] = useState(null);
  const [pdfs, setPdfs] = useState([]);
  const [selected, setSelected] = useState(null);
  const [numPages, setNumPages] = useState(null);

  // Fetch uploaded files
  useEffect(() => {
    async function fetchPdfs() {
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_API_URL || "https://law-network.onrender.com"}/api/gridfs/list`
        );
        setPdfs(res.data);
      } catch (err) {
        console.error("Failed to fetch PDFs", err);
      }
    }
    fetchPdfs();
  }, []);

  // Upload handler
  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return alert("Please select a PDF file");

    const formData = new FormData();
    formData.append("file", file);

    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL || "https://law-network.onrender.com"}/api/gridfs/upload`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      alert("✅ PDF uploaded!");
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert("❌ Upload failed");
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">📚 PDF Demo (GridFS)</h1>

      {/* Upload form */}
      <form onSubmit={handleUpload} className="mb-6 flex gap-3 items-center">
        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => setFile(e.target.files[0])}
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700"
        >
          Upload
        </button>
      </form>

      {/* List PDFs */}
      <div className="mb-6">
        <h2 className="font-semibold mb-2">Uploaded PDFs:</h2>
        <ul className="list-disc pl-6">
          {pdfs.length === 0 && <li>No PDFs uploaded yet</li>}
          {pdfs.map((f) => (
            <li key={f.filename}>
              <button
                onClick={() => setSelected(f.filename)}
                className="text-blue-600 underline"
              >
                {f.filename}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Preview PDF */}
      {selected && (
        <div className="border rounded p-4">
          <h3 className="font-semibold mb-2">Preview: {selected}</h3>
          <Document
            file={`${import.meta.env.VITE_API_URL || "https://law-network.onrender.com"}/api/gridfs/file/${selected}`}
            onLoadSuccess={({ numPages }) => setNumPages(numPages)}
            loading={<p>Loading PDF…</p>}
          >
            {Array.from(new Array(numPages), (el, index) => (
              <Page key={`page_${index + 1}`} pageNumber={index + 1} />
            ))}
          </Document>
        </div>
      )}
    </div>
  );
}
