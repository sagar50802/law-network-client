// src/pages/qna/components/SyllabusTabs.jsx
import React from "react";
import "../../qna/qna.css";

const SyllabusTabs = ({ active, onChange }) => {
  const tabs = ["Units", "Topics", "Subtopics"];

  return (
    <div className="qna-tabs">
      {tabs.map((tab) => (
        <button
          key={tab}
          className={
            "qna-tab " + (active === tab ? "qna-tab-active" : "")
          }
          onClick={() => onChange(tab)}
        >
          {tab}
        </button>
      ))}
    </div>
  );
};

export default SyllabusTabs;
