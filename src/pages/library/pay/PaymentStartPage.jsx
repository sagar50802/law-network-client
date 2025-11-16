import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function PaymentStartPage() {
  const { paymentId } = useParams();
  const navigate = useNavigate();

  const [payment, setPayment] = useState(null);
  const [timer, setTimer] = useState(10);
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/api/library/payment/${paymentId}`)
      .then((res) => res.json())
      .then((data) => setPayment(data.data));
  }, [paymentId]);

  // 🔥 10-second blinking countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((t) => {
        if (t <= 1) {
          clearInterval(interval);
          return 0;
        }
        return t - 1;
      });
      setBlink((b) => !b);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!payment) return <div className="p-6 text-white">Loading...</div>;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center pt-10">
      <h1 className="text-2xl font-bold mb-4">Complete Your Payment</h1>

      <div
        className={`text-lg font-semibold mb-4 ${
          blink ? "text-red-500" : "text-yellow-300"
        }`}
      >
        Confirm Payment Within {timer}s
      </div>

      {/* UPI QR MOCKED — you can load real QR image */}
      <div className="bg-white p-4 rounded shadow-lg mb-4">
        <img
          src="/qr-placeholder.png"
          alt="UPI QR"
          className="w-64 h-64 object-contain"
        />
      </div>

      <div className="text-xl mb-6">
        Amount: <span className="text-green-400">₹{payment.amount}</span>
      </div>

      <div className="flex gap-4">
        <button
          onClick={() =>
            navigate(`/library/pay/submit/${paymentId}`)
          }
          className="px-6 py-3 bg-green-600 hover:bg-green-500 rounded-md text-black font-bold"
        >
          Proceed → Upload Screenshot
        </button>

        <button
          onClick={() => navigate("/library")}
          className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-md"
        >
          Cancel Payment
        </button>
      </div>
    </div>
  );
}
