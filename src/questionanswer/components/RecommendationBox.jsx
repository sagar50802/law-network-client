import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRecommendations } from '../utils/recommendationEngine';
import '../styles/qna.css';

const RecommendationBox = ({ currentTopic, completedSubtopic }) => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadRecommendations();
  }, [currentTopic, completedSubtopic]);

  const loadRecommendations = async () => {
    try {
      const recs = await getRecommendations(currentTopic, completedSubtopic);
      setRecommendations(recs);
    } catch (error) {
      console.error('Error loading recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRecommendationClick = (rec) => {
    if (rec.type === 'topic') {
      navigate(`/qna/syllabus?topic=${rec.id}`);
    } else if (rec.type === 'question') {
      navigate(`/qna/question/${rec.id}`);
    }
  };

  if (loading || recommendations.length === 0) {
    return null;
  }

  return (
    <div className="recommendation-box">
      <div className="rec-header">
        <h3>📚 Smart Recommendation</h3>
        <span className="rec-subtitle">Based on your progress</span>
      </div>
      
      <div className="rec-content">
        <p className="rec-message">
          Since you completed this topic, we recommend:
        </p>
        
        <div className="rec-list">
          {recommendations.map((rec, index) => (
            <div 
              key={index}
              className="rec-item"
              onClick={() => handleRecommendationClick(rec)}
            >
              <div className="rec-icon">
                {rec.type === 'topic' ? '📖' : '❓'}
              </div>
              <div className="rec-details">
                <h4>{rec.title}</h4>
                <p>{rec.description}</p>
                <div className="rec-meta">
                  <span className={`difficulty ${rec.difficulty}`}>
                    {rec.difficulty}
                  </span>
                  <span className="time-estimate">
                    ⏱️ {rec.estimatedTime} min
                  </span>
                  <span className="dependency">
                    {rec.dependency ? 'Requires: ' + rec.dependency : 'Independent'}
                  </span>
                </div>
              </div>
              <button className="rec-action-button">
                Start →
              </button>
            </div>
          ))}
        </div>
      </div>
      
      <div className="rec-footer">
        <p>
          <small>
            Our smart engine analyzes syllabus order and difficulty flow to 
            suggest the most logical next step for your preparation.
          </small>
        </p>
      </div>
    </div>
  );
};

export default RecommendationBox;
