import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function PaymentSubmitPage() {
  const { paymentId } = useParams();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [screenshot, setScreenshot] = useState(null);
  const [preview, setPreview] = useState(null);

  const handleSubmit = async () => {
    if (!screenshot) {
      alert("Please upload screenshot");
      return;
    }

    const formData = new FormData();
    formData.append("name", name);
    formData.append("phone", phone);
    formData.append("screenshot", screenshot);

    const res = await fetch(
      `${API_URL}/api/library/payment/${paymentId}/submit`,
      {
        method: "POST",
        body: formData,
      }
    );

    const data = await res.json();

    if (data.success) {
      alert("Payment submitted! Please wait for approval.");
      navigate("/library");
    } else {
      alert(data.message || "Failed to submit.");
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center pt-10 px-6">
      <h1 className="text-2xl font-bold mb-6">Upload Payment Screenshot</h1>

      <label className="w-full max-w-md mb-4">
        <p className="mb-1">Your Name</p>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full p-2 rounded bg-gray-800 text-white"
        />
      </label>

      <label className="w-full max-w-md mb-4">
        <p className="mb-1">Phone Number</p>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full p-2 rounded bg-gray-800 text-white"
        />
      </label>

      <label className="w-full max-w-md mb-4">
        <p className="mb-1">Payment Screenshot</p>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            setScreenshot(e.target.files[0]);
            setPreview(URL.createObjectURL(e.target.files[0]));
          }}
          className="w-full p-2"
        />
      </label>

      {preview && (
        <img
          src={preview}
          alt="preview"
          className="w-64 h-auto rounded shadow mb-4"
        />
      )}

      <button
        onClick={handleSubmit}
        className="px-8 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-md"
      >
        Submit Payment
      </button>
    </div>
  );
}
