import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import UnitTopicTree from '../components/UnitTopicTree';
import { fetchSyllabusTree } from '../utils/qnaApi';
import '../styles/qna.css';

const QnASyllabusTree = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [syllabus, setSyllabus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [selectedSubtopic, setSelectedSubtopic] = useState(null);

  useEffect(() => {
    loadSyllabus();
  }, [examId]);

  const loadSyllabus = async () => {
    try {
      const data = await fetchSyllabusTree(examId);
      setSyllabus(data);
    } catch (error) {
      console.error('Error loading syllabus:', error);
      navigate('/qna/exams');
    } finally {
      setLoading(false);
    }
  };

  const handleNodeSelect = (nodeType, node) => {
    switch(nodeType) {
      case 'unit':
        setSelectedUnit(node);
        setSelectedTopic(null);
        setSelectedSubtopic(null);
        break;
      case 'topic':
        setSelectedTopic(node);
        setSelectedSubtopic(null);
        break;
      case 'subtopic':
        setSelectedSubtopic(node);
        // Auto-navigate to first question or question list
        if (node.questions && node.questions.length > 0) {
          navigate(`/qna/question/${node.questions[0].id}`);
        }
        break;
    }
  };

  return (
    <div className="syllabus-container">
      <div className="syllabus-header">
        <h1>Syllabus Navigation</h1>
        <p>Follow the structured path: Unit → Topic → Subtopic → Question</p>
      </div>
      
      <div className="syllabus-layout">
        <div className="tree-section">
          <UnitTopicTree 
            syllabus={syllabus}
            onNodeSelect={handleNodeSelect}
            selectedUnit={selectedUnit}
            selectedTopic={selectedTopic}
            selectedSubtopic={selectedSubtopic}
          />
        </div>
        
        <div className="details-section">
          {selectedUnit && (
            <div className="selected-node-info">
              <h3>Selected Path:</h3>
              <div className="path-display">
                <span className="path-unit">{selectedUnit.name}</span>
                {selectedTopic && (
                  <>
                    <span className="path-arrow">→</span>
                    <span className="path-topic">{selectedTopic.name}</span>
                  </>
                )}
                {selectedSubtopic && (
                  <>
                    <span className="path-arrow">→</span>
                    <span className="path-subtopic">{selectedSubtopic.name}</span>
                  </>
                )}
              </div>
              
              {selectedSubtopic && selectedSubtopic.questions && (
                <div className="question-list">
                  <h4>Questions in this Subtopic:</h4>
                  {selectedSubtopic.questions.map((q, index) => (
                    <div 
                      key={q.id}
                      className="question-item"
                      onClick={() => navigate(`/qna/question/${q.id}`)}
                    >
                      <span>Q{index + 1}: {q.title || 'Question'}</span>
                      <span className="status-badge">
                        {q.completed ? '✓ Completed' : 'New'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QnASyllabusTree;
