import { API_BASE } from "../../config/api";

/* ===========================================================
   STUDENT QNA APIs
   =========================================================== */

export async function fetchExams() {
  const res = await fetch(`${API_BASE}/qna/exams`);
  if (!res.ok) throw new Error("Failed to fetch exams");
  return res.json();
}

export async function fetchSyllabus(examId) {
  const res = await fetch(`${API_BASE}/qna/syllabus/${examId}`);
  if (!res.ok) throw new Error("Failed to fetch syllabus");
  return res.json();
}

export async function fetchQuestion(questionId) {
  const res = await fetch(`${API_BASE}/qna/question/${questionId}`);
  if (!res.ok) throw new Error("Failed to fetch question");
  return res.json();
}

export async function fetchProgress() {
  const res = await fetch(`${API_BASE}/qna/progress`);
  if (!res.ok) throw new Error("Failed to fetch progress");
  return res.json();
}

export async function saveProgress(questionId, data) {
  const res = await fetch(`${API_BASE}/qna/progress`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ questionId, ...data }),
  });
  if (!res.ok) throw new Error("Failed to save progress");
  return res.json();
}

export async function fetchRecommendations() {
  const res = await fetch(`${API_BASE}/qna/recommendations`);
  if (!res.ok) throw new Error("Failed to fetch recommendations");
  return res.json();
}

export async function getNextTopics(currentTopicId) {
  const res = await fetch(`${API_BASE}/qna/topics/next/${currentTopicId}`);
  if (!res.ok) throw new Error("Failed to fetch next topics");
  return res.json();
}

export async function getDependentTopics(subtopicId) {
  const res = await fetch(`${API_BASE}/qna/topics/dependent/${subtopicId}`);
  if (!res.ok) throw new Error("Failed to fetch dependent topics");
  return res.json();
}

/* ===========================================================
   LOCAL STORAGE (offline progress)
   =========================================================== */

export function saveProgressToStorage(progress) {
  localStorage.setItem("qna-progress", JSON.stringify(progress));
}

export function getProgressFromStorage() {
  const saved = localStorage.getItem("qna-progress");
  return saved ? JSON.parse(saved) : null;
}

/* ===========================================================
   ADMIN QNA APIs
   =========================================================== */

export async function adminCreateQuestion(questionData) {
  const res = await fetch(`${API_BASE}/qna/admin/questions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(questionData),
  });
  if (!res.ok) throw new Error("Failed to create question");
  return res.json();
}

export async function adminScheduleQuestion(questionId, scheduleData) {
  const res = await fetch(
    `${API_BASE}/qna/admin/questions/${questionId}/schedule`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(scheduleData),
    }
  );
  if (!res.ok) throw new Error("Failed to schedule question");
  return res.json();
}

export async function adminFetchQuestions() {
  const res = await fetch(`${API_BASE}/qna/admin/questions`);
  if (!res.ok) throw new Error("Failed to fetch admin questions");
  return res.json();
}

export async function adminDeleteQuestion(questionId) {
  const res = await fetch(`${API_BASE}/qna/admin/questions/${questionId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete question");
  return res.json();
}
