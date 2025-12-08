import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchExams } from '../utils/qnaApi';
import '../styles/qna.css';

const QnAExamList = () => {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadExams();
  }, []);

  const loadExams = async () => {
    try {
      const data = await fetchExams();
      setExams(data);
    } catch (error) {
      console.error('Error loading exams:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExamSelect = (examId) => {
    navigate(`/qna/syllabus/${examId}`);
  };

  return (
    <div className="exam-list-container">
      <div className="header">
        <h1>Select Your Exam</h1>
        <p>Choose your judiciary/law exam to begin</p>
      </div>
      
      <div className="exam-grid">
        {loading ? (
          <div className="loading">Loading exams...</div>
        ) : (
          exams.map((exam) => (
            <div 
              key={exam.id} 
              className="exam-card"
              onClick={() => handleExamSelect(exam.id)}
            >
              <div className="exam-icon">{exam.icon || "⚖️"}</div>
              <h3>{exam.name}</h3>
              <p>{exam.description}</p>
              <div className="exam-stats">
                <span>{exam.questionCount} Questions</span>
                <span>{exam.completedCount || 0} Completed</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default QnAExamList;
