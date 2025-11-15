import { useState } from "react";
import axios from "axios";

export default function ChangePassword() {
  const [oldPwd, setOld] = useState("");
  const [newPwd, setNew] = useState("");
  const [msg, setMsg] = useState("");

  const token = localStorage.getItem("adminToken");

  const change = async (e) => {
    e.preventDefault();
    try {
      await axios.post(
        "https://law-network-api.onrender.com/api/admin/change-password",
        { token, oldPassword: oldPwd, newPassword: newPwd }
      );
      setMsg("Password changed successfully!");
    } catch (err) {
      setMsg("Error: " + (err?.response?.data?.message || "Something went wrong"));
    }
  };

  return (
    <main className="max-w-md mx-auto px-4 py-16">
      <h1 className="text-2xl font-bold mb-6">Change Password</h1>

      <form onSubmit={change} className="flex flex-col gap-4 bg-white p-6 rounded shadow">
        
        <input
          type="password"
          placeholder="Old Password"
          className="border p-2 rounded"
          onChange={(e) => setOld(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="New Password"
          className="border p-2 rounded"
          onChange={(e) => setNew(e.target.value)}
          required
        />

        <button
          className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded"
          type="submit"
        >
          Save
        </button>
      </form>

      {msg && (
        <p className="mt-4 text-center font-semibold">
          {msg}
        </p>
      )}
    </main>
  );
}
