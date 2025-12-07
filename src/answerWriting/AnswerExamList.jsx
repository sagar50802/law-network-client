import React from "react";
import "./answerWriting.css";

export default function AnswerExamList() {
  const [exams, setExams] = useState([]);

useEffect(() => {
  fetchExams().then(({ data }) => setExams(data.exams));
}, []);

  return (
    <div className="aw-page">
      <div className="aw-page-header">
        <div>
          <div className="aw-pill">Answer Writing</div>
          <h1>Select Your Exam</h1>
          <p className="aw-muted">Choose your exam to begin answer writing practice.</p>
        </div>
      </div>

      <div className="aw-card" style={{ padding: "20px" }}>
        {exams.map(e => (
          <a
            key={e.id}
            href={`/answer-writing/${e.id}`}
            className="aw-btn aw-btn-primary"
            style={{
              display: "block",
              margin: "12px 0",
              textAlign: "center",
              fontSize: "18px",
              padding: "12px"
            }}
          >
            {e.name}
          </a>
        ))}
      </div>
    </div>
  );
}
