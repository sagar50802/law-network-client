import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function AdminLogin() {
  const [pwd, setPwd] = useState("");
  const [err, setErr] = useState("");
  const navigate = useNavigate();

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(
        "https://law-network-api.onrender.com/api/admin/login",
        { password: pwd }
      );

      localStorage.setItem("adminToken", res.data.token);
      navigate("/admin/dashboard");
    } catch (err) {
      setErr("Wrong password");
    }
  };

  return (
    <main className="max-w-md mx-auto px-4 py-16">
      <h1 className="text-2xl font-semibold mb-4">Admin Login</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <input
          type="password"
          className="w-full border rounded p-2"
          placeholder="Enter admin password"
          value={pwd}
          onChange={(e) => setPwd(e.target.value)}
        />
        {err && <div className="text-red-600 text-sm">{err}</div>}
        <button className="bg-black text-white px-4 py-2 rounded">Login</button>
      </form>
    </main>
  );
}
