// src/pages/qna/qnaApi.js
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL, // e.g. https://law-network-server.onrender.com/api
  withCredentials: true,
});

// Attach owner key so only your client can call admin routes if needed
api.interceptors.request.use((config) => {
  const ownerKey = import.meta.env.VITE_OWNER_KEY;
  if (ownerKey) {
    config.headers["x-owner-key"] = ownerKey;
  }
  return config;
});

export const fetchExams = () => api.get("/qna/exams");
export const fetchExamDetail = (examId) => api.get(`/qna/exams/${examId}`);

export const fetchUnits = (examId) =>
  api.get(`/qna/exams/${examId}/units`);
export const fetchTopics = (unitId) =>
  api.get(`/qna/units/${unitId}/topics`);
export const fetchSubtopics = (topicId) =>
  api.get(`/qna/topics/${topicId}/subtopics`);

export const fetchQuestionsBySubtopic = (subtopicId) =>
  api.get(`/qna/subtopics/${subtopicId}/questions`);

export const createExam = (payload) => api.post("/qna/exams", payload);
export const updateExam = (id, payload) =>
  api.put(`/qna/exams/${id}`, payload);
export const deleteExam = (id) => api.delete(`/qna/exams/${id}`);
export const toggleExamLock = (id) =>
  api.post(`/qna/exams/${id}/toggle-lock`);

export const createUnit = (examId, payload) =>
  api.post(`/qna/exams/${examId}/units`, payload);
export const updateUnit = (id, payload) =>
  api.put(`/qna/units/${id}`, payload);
export const deleteUnit = (id) => api.delete(`/qna/units/${id}`);

export const createTopic = (unitId, payload) =>
  api.post(`/qna/units/${unitId}/topics`, payload);
export const updateTopic = (id, payload) =>
  api.put(`/qna/topics/${id}`, payload);
export const deleteTopic = (id) => api.delete(`/qna/topics/${id}`);

export const createSubtopic = (topicId, payload) =>
  api.post(`/qna/topics/${topicId}/subtopics`, payload);
export const updateSubtopic = (id, payload) =>
  api.put(`/qna/subtopics/${id}`, payload);
export const deleteSubtopic = (id) => api.delete(`/qna/subtopics/${id}`);

export const createQuestion = (subtopicId, payload) =>
  api.post(`/qna/subtopics/${subtopicId}/questions`, payload);
export const updateQuestion = (id, payload) =>
  api.put(`/qna/questions/${id}`, payload);
export const deleteQuestion = (id) => api.delete(`/qna/questions/${id}`);

export default api;
