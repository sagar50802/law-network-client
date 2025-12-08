import React, { useState, useEffect } from 'react';
import '../styles/qna.css';

const TeacherAvatar = ({ message, onClose }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [currentMessage, setCurrentMessage] = useState(message);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const messages = [
    "Let's understand this concept...",
    "Notice how the reasoning is built...",
    "Pay attention to the case law here.",
    "This is a key point for exams.",
    "Remember this important principle.",
    "Let me explain the structure...",
    "This connects to what we learned earlier."
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      if (isVisible) {
        setIsSpeaking(true);
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        setCurrentMessage(randomMessage);
        
        setTimeout(() => {
          setIsSpeaking(false);
        }, 3000);
      }
    }, 10000); // Change message every 10 seconds

    return () => clearInterval(interval);
  }, [isVisible]);

  const handleClose = () => {
    setIsVisible(false);
    if (onClose) onClose();
  };

  if (!isVisible) return null;

  return (
    <div className={`teacher-avatar-container ${isSpeaking ? 'speaking' : ''}`}>
      <div className="teacher-avatar">
        <div className="avatar-image">
          <div className="avatar-face">👨‍🏫</div>
          <div className="avatar-speech-bubble">
            <div className="bubble-content">
              <p>{currentMessage}</p>
            </div>
            <div className="bubble-tail"></div>
          </div>
        </div>
        
        <div className="avatar-controls">
          <button 
            className="avatar-button mute"
            onClick={() => setIsSpeaking(!isSpeaking)}
          >
            {isSpeaking ? '🔇' : '🔊'}
          </button>
          <button 
            className="avatar-button close"
            onClick={handleClose}
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
};

export default TeacherAvatar;
