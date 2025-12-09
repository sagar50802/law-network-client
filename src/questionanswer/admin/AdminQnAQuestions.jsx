import React, { useEffect, useState } from "react";
import {
  adminFetchQuestions,
  adminDeleteQuestion,
  adminCreateQuestion,
} from "../utils/qnaApi";

export default function AdminQnAQuestions() {
  const [questions, setQuestions] = useState([]);
  const [form, setForm] = useState({
    subtopicId: "",
    questionHindi: "",
    questionEnglish: "",
    answerHindi: "",
    answerEnglish: "",
  });

  const load = async () => setQuestions(await adminFetchQuestions());

  useEffect(() => {
    load();
  }, []);

  const submit = async () => {
    await adminCreateQuestion(form);
    await load();
    alert("Question created");
  };

  const remove = async (id) => {
    await adminDeleteQuestion(id);
    load();
  };

  return (
    <div className="qna-root" style={{ padding: "20px" }}>
      <h1>QnA Admin – Questions</h1>

      <div className="question-form">
        <input
          placeholder="Subtopic ID"
          onChange={(e) =>
            setForm({ ...form, subtopicId: e.target.value })
          }
        />
        <textarea
          placeholder="Hindi Question"
          onChange={(e) =>
            setForm({ ...form, questionHindi: e.target.value })
          }
        />
        <textarea
          placeholder="English Question"
          onChange={(e) =>
            setForm({ ...form, questionEnglish: e.target.value })
          }
        />

        <textarea
          placeholder="Hindi Answer"
          onChange={(e) =>
            setForm({ ...form, answerHindi: e.target.value })
          }
        />

        <textarea
          placeholder="English Answer"
          onChange={(e) =>
            setForm({ ...form, answerEnglish: e.target.value })
          }
        />

        <button onClick={submit}>Create Question</button>
      </div>

      <hr />

      <h2>All Questions</h2>

      {questions.map((q) => (
        <div key={q.id} className="admin-question">
          <b>{q.questionEnglish}</b>
          <button onClick={() => remove(q.id)}>Delete</button>
        </div>
      ))}
    </div>
  );
}
