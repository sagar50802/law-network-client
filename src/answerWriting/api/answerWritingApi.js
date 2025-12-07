import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

const api = axios.create({
  baseURL: `${API_BASE}`,   // FIXED — DO NOT ADD /answer-writing HERE
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

// Exams
export const fetchExams = () => api.get("/answer-writing/exams");
export const createExam = (payload) =>
  api.post("/answer-writing/exams", payload);
export const fetchExamDetail = (examId) =>
  api.get(`/answer-writing/exams/${examId}`);

// Units
export const createUnit = (examId, payload) =>
  api.post(`/answer-writing/exams/${examId}/units`, payload);

// Topics
export const createTopic = (unitId, payload) =>
  api.post(`/answer-writing/units/${unitId}/topics`, payload);
export const toggleLockTopic = (topicId, locked) =>
  api.patch(`/answer-writing/topics/${topicId}/lock`, { locked });

// Subtopics
export const createSubtopic = (topicId, payload) =>
  api.post(`/answer-writing/topics/${topicId}/subtopics`, payload);

// Questions
export const createQuestion = (subtopicId, payload) =>
  api.post(`/answer-writing/subtopics/${subtopicId}/questions`, payload);
export const deleteQuestion = (questionId) =>
  api.delete(`/answer-writing/questions/${questionId}`);

// Student
export const fetchStudentDashboard = (examId) =>
  api.get(`/answer-writing/student/${examId}/dashboard`);
export const fetchLiveQuestion = (examId) =>
  api.get(`/answer-writing/student/${examId}/live-question`);
