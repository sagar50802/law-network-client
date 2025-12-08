import { getNextTopics, getDependentTopics } from './qnaApi';

export const getRecommendations = async (currentTopicId, completedSubtopicId) => {
  try {
    // Get syllabus-based recommendations
    const nextTopics = await getNextTopics(currentTopicId);
    
    // Get dependent topics
    const dependentTopics = await getDependentTopics(completedSubtopicId);
    
    // Combine and prioritize recommendations
    const recommendations = [
      ...dependentTopics.map(topic => ({
        ...topic,
        type: 'topic',
        priority: 1, // Highest priority
        reason: 'Dependency'
      })),
      ...nextTopics.map(topic => ({
        ...topic,
        type: 'topic',
        priority: 2,
        reason: 'Syllabus Order'
      }))
    ];
    
    // Sort by priority
    recommendations.sort((a, b) => a.priority - b.priority);
    
    // Add metadata
    recommendations.forEach(rec => {
      rec.estimatedTime = calculateEstimatedTime(rec);
      rec.difficulty = determineDifficulty(rec);
    });
    
    return recommendations.slice(0, 3); // Return top 3 recommendations
  } catch (error) {
    console.error('Error in recommendation engine:', error);
    return [];
  }
};

const calculateEstimatedTime = (topic) => {
  // Based on question count and complexity
  const baseTime = 5; // minutes per question
  const questionCount = topic.questionCount || 0;
  return Math.max(15, questionCount * baseTime); // Minimum 15 minutes
};

const determineDifficulty = (topic) => {
  const difficulty = topic.difficulty || 'medium';
  return difficulty;
};

export const updateRecommendationModel = (userAction, topicId) => {
  // This would update the recommendation model based on user behavior
  // For now, we'll just log the action
  console.log('User action recorded:', { userAction, topicId });
  
  // In a real implementation, this would update ML models or rules
  return true;
};
