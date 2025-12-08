const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:3001/api';

export const fetchExams = async () => {
  const response = await fetch(`${API_BASE}/exams`);
  return response.json();
};

export const fetchSyllabusTree = async (examId) => {
  const response = await fetch(`${API_BASE}/syllabus/${examId}`);
  return response.json();
};

export const fetchQuestion = async (questionId) => {
  const response = await fetch(`${API_BASE}/questions/${questionId}`);
  return response.json();
};

export const saveProgress = async (questionId, data) => {
  const response = await fetch(`${API_BASE}/progress`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ questionId, ...data })
  });
  return response.json();
};

export const fetchProgress = async () => {
  const response = await fetch(`${API_BASE}/progress`);
  return response.json();
};

export const fetchRecommendations = async () => {
  const response = await fetch(`${API_BASE}/recommendations`);
  return response.json();
};

export const getNextTopics = async (currentTopicId) => {
  const response = await fetch(`${API_BASE}/topics/next/${currentTopicId}`);
  return response.json();
};

export const getDependentTopics = async (subtopicId) => {
  const response = await fetch(`${API_BASE}/topics/dependent/${subtopicId}`);
  return response.json();
};

// Local storage utilities for offline progress
export const saveProgressToStorage = (progress) => {
  localStorage.setItem('qna-progress', JSON.stringify(progress));
};

export const getProgressFromStorage = () => {
  const saved = localStorage.getItem('qna-progress');
  return saved ? JSON.parse(saved) : null;
};

// Admin APIs
export const createQuestion = async (questionData) => {
  const response = await fetch(`${API_BASE}/admin/questions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(questionData)
  });
  return response.json();
};

export const scheduleQuestion = async (questionId, scheduleData) => {
  const response = await fetch(`${API_BASE}/admin/questions/${questionId}/schedule`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(scheduleData)
  });
  return response.json();
};
