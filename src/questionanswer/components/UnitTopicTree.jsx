import React, { useState } from 'react';
import '../styles/qna.css';

const UnitTopicTree = ({ 
  syllabus, 
  onNodeSelect, 
  selectedUnit, 
  selectedTopic, 
  selectedSubtopic 
}) => {
  const [expandedUnits, setExpandedUnits] = useState({});
  const [expandedTopics, setExpandedTopics] = useState({});

  const toggleUnit = (unitId) => {
    setExpandedUnits(prev => ({
      ...prev,
      [unitId]: !prev[unitId]
    }));
  };

  const toggleTopic = (topicId) => {
    setExpandedTopics(prev => ({
      ...prev,
      [topicId]: !prev[topicId]
    }));
  };

  const getCompletionStatus = (node) => {
    const total = node.totalQuestions || 0;
    const completed = node.completedQuestions || 0;
    
    if (total === 0) return 'empty';
    if (completed === total) return 'complete';
    if (completed > 0) return 'partial';
    return 'not-started';
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'complete': return '✅';
      case 'partial': return '🟡';
      case 'not-started': return '⚪';
      case 'empty': return '📭';
      default: return '⚪';
    }
  };

  return (
    <div className="unit-topic-tree">
      <div className="tree-header">
        <h3>Syllabus Tree</h3>
        <p>Navigate: Unit → Topic → Subtopic → Question</p>
      </div>
      
      <div className="tree-nodes">
        {syllabus.map((unit) => (
          <div key={unit.id} className="tree-unit">
            <div 
              className={`unit-header ${
                selectedUnit?.id === unit.id ? 'selected' : ''
              }`}
              onClick={() => {
                toggleUnit(unit.id);
                onNodeSelect('unit', unit);
              }}
            >
              <div className="unit-title">
                <span className="expand-icon">
                  {expandedUnits[unit.id] ? '▼' : '▶'}
                </span>
                <span className="unit-name">{unit.name}</span>
                <span className="unit-status">
                  {getStatusIcon(getCompletionStatus(unit))}
                </span>
              </div>
              
              <div className="unit-progress">
                <div className="progress-bar">
                  <div 
                    className="progress-fill"
                    style={{
                      width: `${((unit.completedQuestions || 0) / (unit.totalQuestions || 1)) * 100}%`
                    }}
                  />
                </div>
                <span className="progress-text">
                  {unit.completedQuestions || 0}/{unit.totalQuestions || 0}
                </span>
              </div>
            </div>
            
            {expandedUnits[unit.id] && unit.topics && (
              <div className="topics-container">
                {unit.topics.map((topic) => (
                  <div key={topic.id} className="tree-topic">
                    <div 
                      className={`topic-header ${
                        selectedTopic?.id === topic.id ? 'selected' : ''
                      }`}
                      onClick={() => {
                        toggleTopic(topic.id);
                        onNodeSelect('topic', topic);
                      }}
                    >
                      <div className="topic-title">
                        <span className="expand-icon">
                          {expandedTopics[topic.id] ? '▼' : '▶'}
                        </span>
                        <span className="topic-name">{topic.name}</span>
                        <span className="topic-status">
                          {getStatusIcon(getCompletionStatus(topic))}
                        </span>
                      </div>
                    </div>
                    
                    {expandedTopics[topic.id] && topic.subtopics && (
                      <div className="subtopics-container">
                        {topic.subtopics.map((subtopic) => (
                          <div 
                            key={subtopic.id}
                            className={`tree-subtopic ${
                              selectedSubtopic?.id === subtopic.id ? 'selected' : ''
                            }`}
                            onClick={() => onNodeSelect('subtopic', subtopic)}
                          >
                            <div className="subtopic-title">
                              <span className="subtopic-icon">•</span>
                              <span className="subtopic-name">{subtopic.name}</span>
                              <span className="subtopic-status">
                                {getStatusIcon(getCompletionStatus(subtopic))}
                              </span>
                            </div>
                            
                            <div className="subtopic-info">
                              {subtopic.questions?.length > 0 && (
                                <span className="question-count">
                                  {subtopic.questions.length} Q
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default UnitTopicTree;
