// src/pages/qna/components/NotebookQuestionView.jsx
import React, { useEffect, useState } from "react";
import "../../qna/qna.css";

const typeOut = (text, setText) => {
  let i = 0;
  const speed = 18;
  const id = setInterval(() => {
    setText((prev) => prev + text.charAt(i));
    i += 1;
    if (i >= text.length) clearInterval(id);
  }, speed);
  return () => clearInterval(id);
};

const NotebookQuestionView = ({ question }) => {
  const [typedQuestion, setTypedQuestion] = useState("");
  const [typedAnswer, setTypedAnswer] = useState("");

  useEffect(() => {
    setTypedQuestion("");
    if (!question) return;
    return typeOut(question.questionText || "", setTypedQuestion);
  }, [question?._id, question?.questionText]);

  useEffect(() => {
    setTypedAnswer("");
    if (!question) return;
    return typeOut(question.answerText || "", setTypedAnswer);
  }, [question?._id, question?.answerText]);

  if (!question) return null;

  return (
    <div className="qna-notebook">
      <div className="qna-notebook-heading qna-notebook-line">
        Question:
      </div>
      <div className="qna-typing">{typedQuestion}</div>

      <div style={{ height: 16 }} />

      <div className="qna-notebook-heading qna-notebook-line">
        Answer:
      </div>
      <div className="qna-typing">{typedAnswer}</div>

      <div style={{ marginTop: 16, fontSize: 12, color: "#6b7280" }}>
        Released at:{" "}
        {new Date(question.releaseAt).toLocaleString(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        })}
      </div>
    </div>
  );
};

export default NotebookQuestionView;
