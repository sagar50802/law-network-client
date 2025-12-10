// src/pages/qna/AdminPortal.jsx
import React from "react";
import "./qna.css";
import { useNavigate, Link } from "react-router-dom";
import AdminCard from "./components/AdminCard";

const AdminPortal = () => {
  const navigate = useNavigate();

  return (
    <div className="qna-page">
      <Link to="/admin/dashboard" style={{ fontSize: 14, color: "#2563eb" }}>
        ← Back to Dashboard
      </Link>

      <h1 className="qna-title" style={{ marginTop: 12, textAlign: "left" }}>
        Admin Portal
      </h1>
      <p className="qna-subtitle" style={{ textAlign: "left" }}>
        Manage exams, syllabus, and questions
      </p>

      <div className="qna-admin-grid">
        <AdminCard
          icon="🎓"
          title="Exam Management"
          description="Create and manage exam entries with custom icons"
          onClick={() => navigate("/admin/qna/exams")}
        />
        <AdminCard
          icon="📖"
          title="Syllabus Management"
          description="Build syllabus hierarchy with units, topics, and subtopics"
          onClick={() => navigate("/admin/qna/syllabus")}
        />
        <AdminCard
          icon="📄"
          title="Question Management"
          description="Create questions with answers and schedule releases"
          onClick={() => navigate("/admin/qna/questions")}
        />
      </div>
    </div>
  );
};

export default AdminPortal;
