import { API_BASE as ROOT_API } from "../../utils/api";

// ROOT_API is usually "/api"
// We build /api/qna as the base for all QnA endpoints
const API_BASE = `${ROOT_API}/qna`;

/* ===========================================================
   STUDENT QNA APIs
   Backend routes (via server + qnaRoutes):
   GET    /api/qna/exams
   GET    /api/qna/syllabus/:examId
   GET    /api/qna/question/:questionId
   GET    /api/qna/progress
   POST   /api/qna/progress
   =========================================================== */

export async function fetchExams() {
  const res = await fetch(`${API_BASE}/exams`);
  if (!res.ok) throw new Error("Failed to fetch exams");
  return res.json();
}

export async function fetchSyllabus(examId) {
  const res = await fetch(`${API_BASE}/syllabus/${examId}`);
  if (!res.ok) throw new Error("Failed to fetch syllabus");
  return res.json();
}

export async function fetchQuestion(questionId) {
  const res = await fetch(`${API_BASE}/question/${questionId}`);
  if (!res.ok) throw new Error("Failed to fetch question");
  return res.json();
}

export async function fetchProgress() {
  const res = await fetch(`${API_BASE}/progress`);
  if (!res.ok) throw new Error("Failed to fetch progress");
  return res.json();
}

export async function saveProgress(questionId, data) {
  const res = await fetch(`${API_BASE}/progress`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ questionId, ...data }),
  });

  if (!res.ok) throw new Error("Failed to save progress");
  return res.json();
}

/* ===========================================================
   RECOMMENDATIONS
   Backend:
   GET  /api/qna/recommendations
   POST /api/qna/recommendations/action
   GET  /api/qna/topics/next/:topicId
   GET  /api/qna/topics/dependent/:subtopicId
   =========================================================== */

export async function fetchRecommendations() {
  const res = await fetch(`${API_BASE}/recommendations`);
  if (!res.ok) throw new Error("Failed to fetch recommendations");
  return res.json();
}

export async function getNextTopics(topicId) {
  const res = await fetch(`${API_BASE}/topics/next/${topicId}`);
  if (!res.ok) throw new Error("Failed to fetch next topics");
  return res.json();
}

export async function getDependentTopics(subtopicId) {
  const res = await fetch(`${API_BASE}/topics/dependent/${subtopicId}`);
  if (!res.ok) throw new Error("Failed to fetch dependent topics");
  return res.json();
}

/* ===========================================================
   LOCAL STORAGE HELPERS (for useQnAProgress)
   =========================================================== */

export function saveProgressToStorage(progress) {
  localStorage.setItem("qna-progress", JSON.stringify(progress));
}

export function getProgressFromStorage() {
  const saved = localStorage.getItem("qna-progress");
  return saved ? JSON.parse(saved) : null;
}

/* ===========================================================
   ADMIN ROUTES
   Backend:
   GET    /api/qna/admin/questions
   POST   /api/qna/admin/questions
   POST   /api/qna/admin/questions/:id/schedule
   DELETE /api/qna/admin/questions/:id
   GET    /api/qna/admin/analytics
   =========================================================== */

export async function adminCreateQuestion(questionData) {
  const res = await fetch(`${API_BASE}/admin/questions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(questionData),
  });
  if (!res.ok) throw new Error("Failed to create question");
  return res.json();
}

export async function adminScheduleQuestion(questionId, scheduleData) {
  const res = await fetch(
    `${API_BASE}/admin/questions/${questionId}/schedule`,
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
  const res = await fetch(`${API_BASE}/admin/questions`);
  if (!res.ok) throw new Error("Failed to fetch admin questions");
  return res.json();
}

export async function adminDeleteQuestion(questionId) {
  const res = await fetch(`${API_BASE}/admin/questions/${questionId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete question");
  return res.json();
}
