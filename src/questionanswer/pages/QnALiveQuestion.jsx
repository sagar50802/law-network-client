import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ExpandableAnswer from '../components/ExpandableAnswer';
import TeacherAvatar from '../components/TeacherAvatar';
import CountdownTimer from '../components/CountdownTimer';
import RecommendationBox from '../components/RecommendationBox';
import { useQnAProgress } from '../hooks/useQnAProgress';
import { fetchQuestion, saveProgress } from '../utils/qnaApi';
import { setupContentSecurity } from '../utils/contentSecurity';
import '../styles/qna.css';

const QnALiveQuestion = () => {
  const { questionId } = useParams();
  const navigate = useNavigate();
  const [question, setQuestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showHindi, setShowHindi] = useState(true);
  const [showEnglish, setShowEnglish] = useState(true);
  const [writingAnimation, setWritingAnimation] = useState(true);
  const [teacherAvatarEnabled, setTeacherAvatarEnabled] = useState(true);
  const answerRef = useRef(null);
  const { updateProgress } = useQnAProgress();

  useEffect(() => {
    loadQuestion();
    setupContentSecurity();
  }, [questionId]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (question) {
        saveProgress(question.id, { lastPosition: window.scrollY });
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [question]);

  const loadQuestion = async () => {
    try {
      const data = await fetchQuestion(questionId);
      if (!data) {
        navigate('/qna/exams');
        return;
      }
      setQuestion(data);
      
      // Update progress
      updateProgress(data.subtopicId, data.id);
      
      // Auto-save reading start
      saveProgress(data.id, { startedAt: new Date().toISOString() });
    } catch (error) {
      console.error('Error loading question:', error);
      navigate('/qna/syllabus');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerReveal = () => {
    if (teacherAvatarEnabled) {
      // Trigger teacher avatar animation
      const avatar = document.querySelector('.teacher-avatar-container');
      if (avatar) {
        avatar.classList.add('active');
        setTimeout(() => {
          avatar.classList.remove('active');
        }, 5000);
      }
    }
  };

  const handleNextQuestion = () => {
    if (question?.nextQuestionId) {
      navigate(`/qna/question/${question.nextQuestionId}`);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-animation">📝</div>
        <p>Loading question...</p>
      </div>
    );
  }

  if (!question) {
    return <div>Question not found</div>;
  }

  return (
    <div className="live-question-container">
      {/* Header */}
      <div className="question-header">
        <button 
          className="back-button"
          onClick={() => navigate(`/qna/syllabus/${question.examId}`)}
        >
          ← Back to Syllabus
        </button>
        
        <div className="question-meta">
          <span className="question-number">Question #{question.order}</span>
          <span className="question-topic">{question.topicName}</span>
        </div>

        <div className="question-controls">
          <label className="toggle-switch">
            <input 
              type="checkbox" 
              checked={writingAnimation}
              onChange={(e) => setWritingAnimation(e.target.checked)}
            />
            <span className="slider">Animation</span>
          </label>
          
          <label className="toggle-switch">
            <input 
              type="checkbox" 
              checked={teacherAvatarEnabled}
              onChange={(e) => setTeacherAvatarEnabled(e.target.checked)}
            />
            <span className="slider">Teacher Avatar</span>
          </label>
        </div>
      </div>

      {/* Countdown Timer for scheduled releases */}
      {question.scheduledRelease && (
        <CountdownTimer 
          releaseTime={question.scheduledRelease}
          onRelease={loadQuestion}
        />
      )}

      {/* Main Content */}
      <div className="question-content">
        {/* Question Text */}
        <div className="question-text-section">
          <h2 className="question-title-hindi">{question.questionHindi}</h2>
          <h2 className="question-title-english">{question.questionEnglish}</h2>
        </div>

        {/* Green Board Animation Area */}
        <div className={`answer-board ${writingAnimation ? 'animated' : ''}`}>
          <div className="board-header">
            <div className="language-toggles">
              <button 
                className={`lang-toggle ${showHindi ? 'active' : ''}`}
                onClick={() => setShowHindi(!showHindi)}
              >
                हिंदी
              </button>
              <button 
                className={`lang-toggle ${showEnglish ? 'active' : ''}`}
                onClick={() => setShowEnglish(!showEnglish)}
              >
                English
              </button>
            </div>
            
            <button 
              className="reveal-button"
              onClick={handleAnswerReveal}
            >
              Reveal Answer
            </button>
          </div>

          {/* Answer Display */}
          <div className="answer-display" ref={answerRef}>
            {showHindi && (
              <ExpandableAnswer 
                content={question.answerHindi}
                language="hindi"
                isExpanded={false}
              />
            )}
            
            {showEnglish && (
              <ExpandableAnswer 
                content={question.answerEnglish}
                language="english"
                isExpanded={false}
              />
            )}
          </div>
        </div>

        {/* Teacher Avatar */}
        {teacherAvatarEnabled && (
          <TeacherAvatar 
            message="Let's understand this concept..."
            onClose={() => setTeacherAvatarEnabled(false)}
          />
        )}

        {/* Navigation Buttons */}
        <div className="question-navigation">
          <button 
            className="nav-button prev"
            disabled={!question.prevQuestionId}
            onClick={() => navigate(`/qna/question/${question.prevQuestionId}`)}
          >
            ← Previous
          </button>
          
          <button 
            className="nav-button mark-complete"
            onClick={() => {
              saveProgress(question.id, { completed: true });
              updateProgress(question.subtopicId, question.id, true);
            }}
          >
            ✓ Mark Complete
          </button>
          
          <button 
            className="nav-button next"
            onClick={handleNextQuestion}
          >
            Next Question →
          </button>
        </div>

        {/* Smart Recommendation */}
        <RecommendationBox 
          currentTopic={question.topicId}
          completedSubtopic={question.subtopicId}
        />
      </div>
    </div>
  );
};

export default QnALiveQuestion;
