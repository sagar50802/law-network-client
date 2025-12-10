// src/utils/qnaApi.js
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL + "/qna",
  withCredentials: false,
});

const ownerKey = import.meta.env.VITE_OWNER_KEY;

// helper to optionally send admin header
export const withAdmin = (isAdmin = false) => ({
  headers: isAdmin && ownerKey ? { "x-admin-key": ownerKey } : {},
});

// ----- Student / public -----
export const fetchPublicExams = () =>
  api.get("/exams/public").then((res) => res.data);

export const fetchExamTree = (examId) =>
  api.get(`/exams/${examId}/tree`).then((res) => res.data);

export const fetchReleasedQuestionsBySubtopic = (subtopicId) =>
  api
    .get(`/subtopics/${subtopicId}/questions`, {
      params: { onlyReleased: true },
    })
    .then((res) => res.data);

// ----- Admin: exams -----
export const fetchAdminExams = () =>
  api.get("/exams", withAdmin(true)).then((res) => res.data);

export const createExam = (payload) =>
  api.post("/exams", payload, withAdmin(true)).then((res) => res.data);

export const updateExam = (id, payload) =>
  api.put(`/exams/${id}`, payload, withAdmin(true)).then((res) => res.data);

export const deleteExam = (id) =>
  api.delete(`/exams/${id}`, withAdmin(true)).then((res) => res.data);

export const toggleExamLock = (id, locked) =>
  api
    .patch(`/exams/${id}/lock`, { locked }, withAdmin(true))
    .then((res) => res.data);

// ----- Admin: syllabus hierarchy -----
export const fetchUnits = (examId) =>
  api
    .get(`/exams/${examId}/units`, withAdmin(true))
    .then((res) => res.data);

export const createUnit = (examId, payload) =>
  api
    .post(`/exams/${examId}/units`, payload, withAdmin(true))
    .then((res) => res.data);

export const updateUnit = (unitId, payload) =>
  api.put(`/units/${unitId}`, payload, withAdmin(true)).then((res) => res.data);

export const deleteUnit = (unitId) =>
  api
    .delete(`/units/${unitId}`, withAdmin(true))
    .then((res) => res.data);

export const fetchTopics = (unitId) =>
  api
    .get(`/units/${unitId}/topics`, withAdmin(true))
    .then((res) => res.data);

export const createTopic = (unitId, payload) =>
  api
    .post(`/units/${unitId}/topics`, payload, withAdmin(true))
    .then((res) => res.data);

export const updateTopic = (topicId, payload) =>
  api
    .put(`/topics/${topicId}`, payload, withAdmin(true))
    .then((res) => res.data);

export const deleteTopic = (topicId) =>
  api
    .delete(`/topics/${topicId}`, withAdmin(true))
    .then((res) => res.data);

export const fetchSubtopics = (topicId) =>
  api
    .get(`/topics/${topicId}/subtopics`, withAdmin(true))
    .then((res) => res.data);

export const createSubtopic = (topicId, payload) =>
  api
    .post(`/topics/${topicId}/subtopics`, payload, withAdmin(true))
    .then((res) => res.data);

export const updateSubtopic = (subtopicId, payload) =>
  api
    .put(`/subtopics/${subtopicId}`, payload, withAdmin(true))
    .then((res) => res.data);

export const deleteSubtopic = (subtopicId) =>
  api
    .delete(`/subtopics/${subtopicId}`, withAdmin(true))
    .then((res) => res.data);

// ----- Admin: questions -----
export const fetchQuestionsForSubtopic = (subtopicId) =>
  api
    .get(`/subtopics/${subtopicId}/questions`, withAdmin(true))
    .then((res) => res.data);

export const createQuestion = (subtopicId, payload) =>
  api
    .post(`/subtopics/${subtopicId}/questions`, payload, withAdmin(true))
    .then((res) => res.data);

export const updateQuestion = (questionId, payload) =>
  api
    .put(`/questions/${questionId}`, payload, withAdmin(true))
    .then((res) => res.data);

export const deleteQuestion = (questionId) =>
  api
    .delete(`/questions/${questionId}`, withAdmin(true))
    .then((res) => res.data);
 
