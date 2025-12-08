import React, { useState, useRef, useEffect } from 'react';
import '../styles/qna.css';

const ExpandableAnswer = ({ content, language, isExpanded = false }) => {
  const [expanded, setExpanded] = useState(isExpanded);
  const [contentHeight, setContentHeight] = useState(0);
  const contentRef = useRef(null);
  const [previewText, setPreviewText] = useState('');

  useEffect(() => {
    if (contentRef.current) {
      // Calculate actual content height
      setContentHeight(contentRef.current.scrollHeight);
      
      // Generate preview (first 3-5 lines)
      const lines = content.split('\n').slice(0, 5);
      setPreviewText(lines.join('\n'));
    }
  }, [content]);

  const toggleExpand = () => {
    setExpanded(!expanded);
  };

  const shouldShowExpand = contentHeight > 150; // Show expand if content > 150px

  return (
    <div className={`expandable-answer ${language} ${expanded ? 'expanded' : 'collapsed'}`}>
      <div 
        ref={contentRef}
        className="answer-content"
        style={{
          maxHeight: expanded ? `${contentHeight}px` : '120px',
          overflow: 'hidden'
        }}
      >
        {content.split('\n').map((line, index) => (
          <p key={index} className="answer-line">
            {line}
            {language === 'english' && index === 0 && (
              <span className="highlight-marker">🔍</span>
            )}
          </p>
        ))}
      </div>
      
      {shouldShowExpand && (
        <div className="expand-controls">
          <button 
            className="expand-button"
            onClick={toggleExpand}
            aria-label={expanded ? 'Collapse answer' : 'Expand answer'}
          >
            {expanded ? (
              <>
                <span className="button-icon">↑</span>
                <span>Show Less</span>
              </>
            ) : (
              <>
                <span className="button-icon">↓</span>
                <span>Show More</span>
              </>
            )}
          </button>
          
          <div className="language-indicator">
            {language === 'hindi' ? 'हिंदी' : 'English'}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpandableAnswer;
