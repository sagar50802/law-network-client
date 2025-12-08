import React from 'react';
import { Link } from 'react-router-dom';
import '../../styles/answerWriting.css';

const AnswerWritingHome = () => {
  return (
    <div className="answer-writing-home">
      <div className="hero-section">
        <h1>Answer Writing & Reading System</h1>
        <p className="subtitle">Bilingual Preparation Platform for Judiciary/Law Exams</p>
        
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">📚</div>
            <h3>Structured Syllabus</h3>
            <p>Follow mandatory Unit → Topic → Subtopic → Question path</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">🎓</div>
            <h3>Bilingual Content</h3>
            <p>Questions and answers in both Hindi and English</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">🤖</div>
            <h3>Smart Recommendations</h3>
            <p>AI-powered next-step suggestions based on your progress</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">👨‍🏫</div>
            <h3>Teacher Avatar</h3>
            <p>Animated classroom guidance and explanations</p>
          </div>
        </div>
        
        <div className="cta-buttons">
          <Link to="/answer-writing/exams" className="primary-btn">
            Start Learning →
          </Link>
          <Link to="/answer-writing/dashboard" className="secondary-btn">
            View Dashboard
          </Link>
        </div>
        
        <div className="quick-links">
          <h3>Popular Exams</h3>
          <div className="exam-links">
            <Link to="/answer-writing/syllabus/judiciary-prelim">Judiciary Preliminary</Link>
            <Link to="/answer-writing/syllabus/civil-judge">Civil Judge Exam</Link>
            <Link to="/answer-writing/syllabus/high-court">High Court Exam</Link>
            <Link to="/answer-writing/syllabus/clat">CLAT Preparation</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnswerWritingHome;
