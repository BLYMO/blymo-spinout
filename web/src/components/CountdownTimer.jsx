import React, { useState, useEffect } from 'react';

const CountdownTimer = ({ targetDate }) => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = new Date(targetDate).getTime() - now;

      if (distance < 0) {
        clearInterval(timer);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      } else {
        setTimeLeft({
          days: Math.floor(distance / (1000 * 60 * 60 * 24)),
          hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((distance % (1000 * 60)) / 1000)
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  return (
    <div className="countdown-container glass-card">
      <div className="countdown-header">
        <span className="badge badge-pulse">Launch Special</span>
        <p>7-Day Free Trial offer expires in:</p>
      </div>
      <div className="countdown-grid">
        <div className="countdown-item">
          <span className="countdown-value">{timeLeft.days}</span>
          <span className="countdown-label">Days</span>
        </div>
        <div className="countdown-divider">:</div>
        <div className="countdown-item">
          <span className="countdown-value">{String(timeLeft.hours).padStart(2, '0')}</span>
          <span className="countdown-label">Hours</span>
        </div>
        <div className="countdown-divider">:</div>
        <div className="countdown-item">
          <span className="countdown-value">{String(timeLeft.minutes).padStart(2, '0')}</span>
          <span className="countdown-label">Mins</span>
        </div>
        <div className="countdown-divider">:</div>
        <div className="countdown-item">
          <span className="countdown-value">{String(timeLeft.seconds).padStart(2, '0')}</span>
          <span className="countdown-label">Secs</span>
        </div>
      </div>
    </div>
  );
};

export default CountdownTimer;
