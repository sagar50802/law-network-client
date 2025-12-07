// client/src/answerWriting/api/answerWritingApi.js
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

const api = axios.create({
  baseURL: `${API_BASE}/answer-writing`,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

/* -------------------------------------------------------------------------- */
/*                                   EXAMS                                    */
/* -------------------------------------------------------------------------- */

export const fetchExams = () => api.get("/exams");

export const createExam = (payload) => api.post("/exams", payload);

export const fetchExamDetail = (examId) => api.get(`/exams/${examId}`);

/* -------------------------------------------------------------------------- */
/*                                   UNITS                                    */
/* -------------------------------------------------------------------------- */

export const createUnit = (examId, payload) =>
  api.post(`/exams/${examId}/units`, payload);

export const updateUnit = (unitId, payload) =>
  api.patch(`/units/${unitId}`, payload);

export const deleteUnitApi = (unitId) => api.delete(`/units/${unitId}`);

/* -------------------------------------------------------------------------- */
/*                                   TOPICS                                   */
/* -------------------------------------------------------------------------- */

export const createTopic = (unitId, payload) =>
  api.post(`/units/${unitId}/topics`, payload);

export const updateTopic = (topicId, payload) =>
  api.patch(`/topics/${topicId}`, payload);

export const deleteTopicApi = (topicId) => api.delete(`/topics/${topicId}`);

export const toggleLockTopic = (topicId, locked) =>
  api.patch(`/topics/${topicId}/lock`, { locked });

/* -------------------------------------------------------------------------- */
/*                                 SUBTOPICS                                  */
/* -------------------------------------------------------------------------- */

export const createSubtopic = (topicId, payload) =>
  api.post(`/topics/${topicId}/subtopics`, payload);

export const updateSubtopic = (subtopicId, payload) =>
  api.patch(`/subtopics/${subtopicId}`, payload);

export const deleteSubtopicApi = (subtopicId) =>
  api.delete(`/subtopics/${subtopicId}`);

/* -------------------------------------------------------------------------- */
/*                                 QUESTIONS                                  */
/* -------------------------------------------------------------------------- */

export const createQuestion = (subtopicId, payload) =>
  api.post(`/subtopics/${subtopicId}/questions`, payload);

export const deleteQuestion = (questionId) =>
  api.delete(`/questions/${questionId}`);

/* -------------------------------------------------------------------------- */
/*                                  STUDENT                                   */
/* -------------------------------------------------------------------------- */

export const fetchStudentDashboard = (examId) =>
  api.get(`/student/${examId}/dashboard`);

export const fetchLiveQuestion = (examId) =>
  api.get(`/student/${examId}/live-question`);
