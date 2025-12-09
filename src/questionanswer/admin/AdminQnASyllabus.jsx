import React, { useEffect, useState } from "react";
import { fetchSyllabus } from "../utils/qnaApi";
import { useParams, useNavigate } from "react-router-dom";

export default function AdminQnASyllabus() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [syllabus, setSyllabus] = useState([]);

  useEffect(() => {
    fetchSyllabus(examId).then(setSyllabus);
  }, [examId]);

  return (
    <div className="qna-root" style={{ padding: "20px" }}>
      <h1>QnA Admin – Syllabus</h1>

      {syllabus.map((unit) => (
        <div key={unit.id} className="admin-unit">
          <h3>{unit.name}</h3>

          {unit.topics?.map((topic) => (
            <div key={topic.id} className="admin-topic">
              <h4>{topic.name}</h4>

              {topic.subtopics?.map((s) => (
                <div key={s.id} className="admin-subtopic">
                  <span>{s.name}</span>

                  <button
                    onClick={() =>
                      navigate(`/admin/qna/questions?subtopic=${s.id}`)
                    }
                  >
                    Manage Questions
                  </button>
                </div>
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
