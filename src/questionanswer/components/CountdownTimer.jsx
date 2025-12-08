import React, { useState, useEffect } from 'react';
import '../styles/qna.css';

const CountdownTimer = ({ releaseTime, onRelease }) => {
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  function calculateTimeLeft() {
    const difference = new Date(releaseTime) - new Date();
    
    if (difference <= 0) {
      return { hours: 0, minutes: 0, seconds: 0, isReleased: true };
    }

    return {
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / 1000 / 60) % 60),
      seconds: Math.floor((difference / 1000) % 60),
      isReleased: false
    };
  }

  useEffect(() => {
    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft();
      setTimeLeft(newTimeLeft);
      
      if (newTimeLeft.isReleased) {
        clearInterval(timer);
        if (onRelease) onRelease();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [releaseTime]);

  if (timeLeft.isReleased) {
    return (
      <div className="countdown-timer released">
        <div className="timer-message">
          🎉 Question is now available!
        </div>
      </div>
    );
  }

  return (
    <div className="countdown-timer">
      <div className="timer-header">
        <span className="timer-icon">⏰</span>
        <h4>Question Available In:</h4>
      </div>
      
      <div className="timer-display">
        <div className="time-unit">
          <span className="time-value">{String(timeLeft.hours).padStart(2, '0')}</span>
          <span className="time-label">Hours</span>
        </div>
        <div className="time-separator">:</div>
        <div className="time-unit">
          <span className="time-value">{String(timeLeft.minutes).padStart(2, '0')}</span>
          <span className="time-label">Minutes</span>
        </div>
        <div className="time-separator">:</div>
        <div className="time-unit">
          <span className="time-value">{String(timeLeft.seconds).padStart(2, '0')}</span>
          <span className="time-label">Seconds</span>
        </div>
      </div>
      
      <div className="timer-note">
        This question will auto-reveal at the scheduled time
      </div>
    </div>
  );
};

export default CountdownTimer;
