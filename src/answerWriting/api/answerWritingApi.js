import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

const api = axios.create({
  baseURL: `${API_BASE}/answer-writing`,   // ✅ FIXED — correct prefix
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

// Exams
export const fetchExams = () => api.get(`/exams`);
export const createExam = (payload) => api.post(`/exams`, payload);
export const fetchExamDetail = (examId) => api.get(`/exams/${examId}`);

// Units
export const createUnit = (examId, payload) =>
  api.post(`/exams/${examId}/units`, payload);

// Topics
export const createTopic = (unitId, payload) =>
  api.post(`/units/${unitId}/topics`, payload);

export const toggleLockTopic = (topicId, locked) =>
  api.patch(`/topics/${topicId}/lock`, { locked });

// Subtopics
export const createSubtopic = (topicId, payload) =>
  api.post(`/topics/${topicId}/subtopics`, payload);

// Questions
export const createQuestion = (subtopicId, payload) =>
  api.post(`/subtopics/${subtopicId}/questions`, payload);

export const deleteQuestion = (questionId) =>
  api.delete(`/questions/${questionId}`);

// Student
export const fetchStudentDashboard = (examId) =>
  api.get(`/student/${examId}/dashboard`);

export const fetchLiveQuestion = (examId) =>
  api.get(`/student/${examId}/live-question`);
