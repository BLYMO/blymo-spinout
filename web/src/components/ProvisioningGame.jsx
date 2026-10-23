import React, { useState, useEffect, useRef } from 'react';
import { Zap, Play, RotateCcw } from 'lucide-react';

const ProvisioningGame = () => {
  const canvasRef = useRef(null);
  const [gameState, setGameState] = useState('idle'); // 'idle', 'playing', 'gameover'
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => parseInt(localStorage.getItem('trybase_high_score') || '0'));

  const gameRef = useRef({
    player: { y: 150, velocity: 0, width: 30, height: 30 },
    obstacles: [],
    frame: 0,
    speed: 4,
    gravity: 0.6,
    jumpStrength: -10,
    groundY: 170
  });

  useEffect(() => {
    localStorage.setItem('trybase_high_score', highScore.toString());
  }, [highScore]);

  const startGame = () => {
    setGameState('playing');
    setScore(0);
    gameRef.current = {
      player: { y: 150, velocity: 0, width: 30, height: 30 },
      obstacles: [],
      frame: 0,
      speed: 4,
      gravity: 0.6,
      jumpStrength: -10,
      groundY: 170
    };
  };

  const jump = () => {
    if (gameState !== 'playing') return;
    const { player, groundY } = gameRef.current;
    if (player.y >= groundY - player.height) {
      gameRef.current.player.velocity = gameRef.current.jumpStrength;
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (gameState === 'idle' || gameState === 'gameover') startGame();
        else jump();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  useEffect(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const gameLoop = () => {
      const { player, obstacles, speed, gravity, groundY } = gameRef.current;

      // Update Player
      player.velocity += gravity;
      player.y += player.velocity;

      if (player.y > groundY - player.height) {
        player.y = groundY - player.height;
        player.velocity = 0;
      }

      // Spawn Obstacles
      if (gameRef.current.frame % 100 === 0) {
        obstacles.push({
          x: canvas.width,
          width: 20,
          height: 30 + Math.random() * 20
        });
      }

      // Update Obstacles
      for (let i = obstacles.length - 1; i >= 0; i--) {
        obstacles[i].x -= speed;
        
        // Collision Detection
        if (
          100 < obstacles[i].x + obstacles[i].width &&
          100 + player.width > obstacles[i].x &&
          player.y < groundY &&
          player.y + player.height > groundY - obstacles[i].height
        ) {
          setGameState('gameover');
          cancelAnimationFrame(animationFrameId);
          return;
        }

        if (obstacles[i].x + obstacles[i].width < 0) {
          obstacles.splice(i, 1);
          setScore(s => {
            const newScore = s + 1;
            if (newScore > highScore) setHighScore(newScore);
            return newScore;
          });
        }
      }

      // Speed up
      if (gameRef.current.frame % 500 === 0) {
        gameRef.current.speed += 0.2;
      }

      // Draw
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw Ground
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.beginPath();
      ctx.moveTo(0, groundY);
      ctx.lineTo(canvas.width, groundY);
      ctx.stroke();

      // Draw Player (Lightning Bolt simple shape)
      ctx.fillStyle = '#3B82F6';
      ctx.beginPath();
      ctx.moveTo(100 + 15, player.y);
      ctx.lineTo(100, player.y + 15);
      ctx.lineTo(100 + 10, player.y + 15);
      ctx.lineTo(100 + 5, player.y + 30);
      ctx.lineTo(100 + 20, player.y + 10);
      ctx.lineTo(100 + 10, player.y + 10);
      ctx.closePath();
      ctx.fill();

      // Draw Obstacles (Server towers)
      ctx.fillStyle = '#9CA3AF';
      obstacles.forEach(obs => {
        ctx.fillRect(obs.x, groundY - obs.height, obs.width, obs.height);
        // Server details
        ctx.fillStyle = '#111';
        ctx.fillRect(obs.x + 4, groundY - obs.height + 5, 4, 4);
        ctx.fillRect(obs.x + 4, groundY - obs.height + 12, 4, 4);
        ctx.fillStyle = '#9CA3AF';
      });

      gameRef.current.frame++;
      animationFrameId = requestAnimationFrame(gameLoop);
    };

    animationFrameId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [gameState, highScore]);

  return (
    <div style={{ 
      background: 'rgba(255,255,255,0.02)', 
      borderRadius: '12px', 
      border: '1px solid var(--border-subtle)',
      padding: '1.5rem',
      marginBottom: '2rem',
      textAlign: 'center',
      position: 'relative'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', fontSize: '0.85rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Zap size={14} className="text-accent-blue" />
          <span className="text-secondary uppercase tracking-widest">TryBase Runner</span>
        </div>
        <div>
          <span className="text-secondary">Score: </span>
          <span style={{ fontWeight: 'bold', color: 'white', marginRight: '1rem' }}>{score}</span>
          <span className="text-secondary">High: </span>
          <span style={{ fontWeight: 'bold', color: 'var(--accent-purple)' }}>{highScore}</span>
        </div>
      </div>

      <canvas 
        ref={canvasRef} 
        width={800} 
        height={200}
        onClick={jump}
        style={{ 
          width: '100%', 
          height: '150px', 
          background: 'rgba(0,0,0,0.2)', 
          borderRadius: '8px',
          cursor: gameState === 'playing' ? 'pointer' : 'default'
        }}
      />

      {(gameState === 'idle' || gameState === 'gameover') && (
        <div style={{ 
          position: 'absolute', 
          inset: 0, 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center',
          background: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(4px)',
          borderRadius: '12px'
        }}>
          {gameState === 'gameover' && <h2 style={{ color: '#ef4444', marginBottom: '0.5rem' }}>GAME OVER</h2>}
          <p className="text-secondary" style={{ marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            {gameState === 'idle' ? "Wait in style. Jump over the servers." : "Ouch! The infrastructure caught you."}
          </p>
          <button onClick={startGame} className="btn btn-primary" style={{ padding: '0.5rem 1.5rem' }}>
            {gameState === 'idle' ? <><Play size={18} /> Play Game</> : <><RotateCcw size={18} /> Try Again</>}
          </button>
          <p style={{ marginTop: '1rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>Press SPACE to jump</p>
        </div>
      )}
    </div>
  );
};

export default ProvisioningGame;
