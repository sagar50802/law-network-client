// src/pages/qna/components/AdminCard.jsx
import React from "react";
import "../../qna/qna.css";

const AdminCard = ({ icon, title, description, onClick }) => {
  return (
    <div className="qna-card" style={{ cursor: "pointer" }} onClick={onClick}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ fontSize: 32 }}>{icon}</div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>{title}</div>
          <div style={{ color: "#6b7280", fontSize: 14 }}>{description}</div>
        </div>
        <button className="qna-btn-primary">Manage</button>
      </div>
    </div>
  );
};

export default AdminCard;
