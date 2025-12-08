import { useState, useEffect } from 'react';
import { saveProgressToStorage, getProgressFromStorage } from '../utils/qnaApi';

export const useQnAProgress = () => {
  const [progress, setProgress] = useState({
    completedTopics: [],
    completedQuestions: [],
    currentUnit: null,
    currentTopic: null,
    readingTime: 0
  });

  useEffect(() => {
    // Load progress from localStorage or API
    const savedProgress = getProgressFromStorage();
    if (savedProgress) {
      setProgress(savedProgress);
    }
  }, []);

  const updateProgress = (subtopicId, questionId, markComplete = false) => {
    setProgress(prev => {
      const newProgress = { ...prev };
      
      if (markComplete && questionId) {
        if (!newProgress.completedQuestions.includes(questionId)) {
          newProgress.completedQuestions.push(questionId);
        }
      }
      
      // Update current subtopic
      newProgress.currentSubtopic = subtopicId;
      
      // Save to storage
      saveProgressToStorage(newProgress);
      
      return newProgress;
    });
  };

  const getTopicProgress = (topicId) => {
    const topicQuestions = []; // This would come from API
    const completed = progress.completedQuestions.filter(qId => 
      topicQuestions.includes(qId)
    );
    
    return {
      completed: completed.length,
      total: topicQuestions.length,
      percentage: topicQuestions.length > 0 
        ? (completed.length / topicQuestions.length) * 100 
        : 0
    };
  };

  const resetProgress = () => {
    setProgress({
      completedTopics: [],
      completedQuestions: [],
      currentUnit: null,
      currentTopic: null,
      readingTime: 0
    });
    localStorage.removeItem('qna-progress');
  };

  return {
    progress,
    updateProgress,
    getTopicProgress,
    resetProgress
  };
};
