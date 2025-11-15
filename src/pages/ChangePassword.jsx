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
      const res = await axios.post(
        "https://law-network-api.onrender.com/api/admin/change-password",
        { token, oldPassword: oldPwd, newPassword: newPwd }
      );
      setMsg("Password changed successfully!");
    } catch (err) {
      setMsg("Error: " + err?.response?.data?.message);
    }
  };

  return (
    <main className="max-w-md mx-auto px-4 py-16">
      <h1>Change Password</h1>
      <form onSubmit={change}>
        <input type="password" placeholder="Old" onChange={(e) => setOld(e.target.value)} />
        <input type="password" placeholder="New" onChange={(e) => setNew(e.target.value)} />
        <button>Save</button>
      </form>
      <p>{msg}</p>
    </main>
  );
}
