import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

const api = axios.create({
  baseURL: `${API_BASE}/answer-writing`,
  withCredentials: true,
});

// NOTE: these are just shapes; backend will be added later
export const fetchExams = () => api.get("/exams");
export const createExam = (payload) => api.post("/exams", payload);

export const fetchExamDetail = (examId) => api.get(`/exams/${examId}`);
export const createUnit = (examId, payload) =>
  api.post(`/exams/${examId}/units`, payload);
export const createTopic = (unitId, payload) =>
  api.post(`/units/${unitId}/topics`, payload);
export const createSubtopic = (topicId, payload) =>
  api.post(`/topics/${topicId}/subtopics`, payload);
export const createQuestion = (subtopicId, payload) =>
  api.post(`/subtopics/${subtopicId}/questions`, payload);

export const toggleLockTopic = (topicId, locked) =>
  api.patch(`/topics/${topicId}/lock`, { locked });

export const deleteQuestion = (questionId) =>
  api.delete(`/questions/${questionId}`);

export const fetchStudentDashboard = (examId) =>
  api.get(`/student/${examId}/dashboard`);

export const fetchLiveQuestion = (examId) =>
  api.get(`/student/${examId}/live-question`);
