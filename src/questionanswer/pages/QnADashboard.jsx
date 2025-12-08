import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchProgress, fetchRecommendations } from '../utils/qnaApi';
import '../styles/qna.css';

const QnADashboard = () => {
  const navigate = useNavigate();
  const [progress, setProgress] = useState({});
  const [recommendations, setRecommendations] = useState([]);
  const [stats, setStats] = useState({
    totalQuestions: 0,
    completed: 0,
    accuracy: 0,
    streak: 0
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [progressData, recData] = await Promise.all([
        fetchProgress(),
        fetchRecommendations()
      ]);
      
      setProgress(progressData);
      setRecommendations(recData);
      
      // Calculate stats
      const completed = progressData.completedQuestions?.length || 0;
      const total = progressData.totalQuestions || 0;
      setStats({
        totalQuestions: total,
        completed,
        accuracy: total > 0 ? Math.round((completed / total) * 100) : 0,
        streak: progressData.streak || 0
      });
    } catch (error) {
      console.error('Error loading dashboard:', error);
    }
  };

  const ProgressPath = ({ progress }) => {
    const pathSegments = [
      { name: 'Unit 1', progress: 80 },
      { name: 'Unit 2', progress: 60 },
      { name: 'Unit 3', progress: 30 },
      { name: 'Unit 4', progress: 10 },
    ];

    return (
      <div className="progress-path">
        <div className="path-line">
          {pathSegments.map((segment, index) => (
            <div key={index} className="path-segment">
              <div 
                className="segment-progress"
                style={{ width: `${segment.progress}%` }}
              />
              <div className="segment-label">{segment.name}</div>
              <div className="segment-emoji">
                {segment.progress === 100 ? '🎯' : '🚶'}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>My Learning Dashboard</h1>
        <p>Track your progress and continue your journey</p>
      </div>

      {/* Stats Overview */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-value">{stats.completed}/{stats.totalQuestions}</div>
          <div className="stat-label">Questions Completed</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">🎯</div>
          <div className="stat-value">{stats.accuracy}%</div>
          <div className="stat-label">Overall Accuracy</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">🔥</div>
          <div className="stat-value">{stats.streak} days</div>
          <div className="stat-label">Learning Streak</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">⏱️</div>
          <div className="stat-value">24h</div>
          <div className="stat-label">Time Spent</div>
        </div>
      </div>

      {/* Progress Path */}
      <div className="section">
        <h2>Your Learning Journey</h2>
        <ProgressPath progress={progress} />
      </div>

      {/* Daily Task Tracker */}
      <div className="section">
        <h2>Today's Goals</h2>
        <div className="daily-tasks">
          <div className="task-item completed">
            <span>✓ Read 5 questions</span>
          </div>
          <div className="task-item completed">
            <span>✓ Complete 1 topic</span>
          </div>
          <div className="task-item pending">
            <span>Practice writing 2 answers</span>
          </div>
          <div className="task-item pending">
            <span>Revise previous topics</span>
          </div>
        </div>
      </div>

      {/* Smart Recommendations */}
      <div className="section">
        <h2>Recommended Next Steps</h2>
        <div className="recommendations-grid">
          {recommendations.map((rec, index) => (
            <div 
              key={index}
              className="recommendation-card"
              onClick={() => navigate(`/qna/syllabus/${rec.examId}`)}
            >
              <div className="rec-icon">👉</div>
              <div className="rec-content">
                <h4>{rec.title}</h4>
                <p>{rec.description}</p>
                <div className="rec-meta">
                  <span>{rec.difficulty}</span>
                  <span>{rec.estimatedTime} min</span>
                </div>
              </div>
              <button className="rec-action">Start</button>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="section">
        <h2>Recent Activity</h2>
        <div className="activity-list">
          {progress.recentActivity?.map((activity, index) => (
            <div key={index} className="activity-item">
              <span className="activity-icon">📚</span>
              <div className="activity-details">
                <span>{activity.action}</span>
                <span className="activity-time">{activity.time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default QnADashboard;
