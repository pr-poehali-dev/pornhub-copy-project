import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const GRID_SIZE = 28;
const GRID_HEIGHT = 31;
const CELL_SIZE = 20;
const FPS = 10;

type Position = { x: number; y: number };
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | null;

const MAZE = [
  '############################',
  '#............##............#',
  '#.####.#####.##.#####.####.#',
  '#O####.#####.##.#####.####O#',
  '#.####.#####.##.#####.####.#',
  '#..........................#',
  '#.####.##.########.##.####.#',
  '#.####.##.########.##.####.#',
  '#......##....##....##......#',
  '######.##### ## #####.######',
  '######.##### ## #####.######',
  '######.##          ##.######',
  '######.## ###--### ##.######',
  '######.## #      # ##.######',
  '      .   #      #   .      ',
  '######.## #      # ##.######',
  '######.## ######## ##.######',
  '######.##          ##.######',
  '######.## ######## ##.######',
  '######.## ######## ##.######',
  '#............##............#',
  '#.####.#####.##.#####.####.#',
  '#.####.#####.##.#####.####.#',
  '#O..##.......  .......##..O#',
  '###.##.##.########.##.##.###',
  '###.##.##.########.##.##.###',
  '#......##....##....##......#',
  '#.##########.##.##########.#',
  '#.##########.##.##########.#',
  '#..........................#',
  '############################',
];

const GHOSTS_START: Position[] = [
  { x: 12, y: 14 },
  { x: 14, y: 14 },
  { x: 15, y: 14 },
  { x: 16, y: 14 },
];

const GHOST_COLORS = ['#FF0000', '#00FFFF', '#FFB8FF', '#FFB852'];

const Index = () => {
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'paused' | 'gameover'>('menu');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [pacman, setPacman] = useState<Position>({ x: 14, y: 23 });
  const [direction, setDirection] = useState<Direction>(null);
  const [nextDirection, setNextDirection] = useState<Direction>(null);
  const [ghosts, setGhosts] = useState<Position[]>(GHOSTS_START);
  const [dots, setDots] = useState<Set<string>>(new Set());
  const [powerMode, setPowerMode] = useState(false);
  const [powerModeTimer, setPowerModeTimer] = useState<NodeJS.Timeout | null>(null);
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);

  const initializeDots = useCallback(() => {
    const newDots = new Set<string>();
    for (let y = 0; y < MAZE.length; y++) {
      for (let x = 0; x < MAZE[y].length; x++) {
        if (MAZE[y][x] === '.') {
          newDots.add(`${x},${y}`);
        }
      }
    }
    setDots(newDots);
  }, []);

  const isWall = (x: number, y: number): boolean => {
    if (y < 0 || y >= MAZE.length || x < 0 || x >= MAZE[0].length) return true;
    return MAZE[y][x] === '#' || MAZE[y][x] === '-';
  };

  const canMove = (pos: Position, dir: Direction): boolean => {
    if (!dir) return false;
    let newX = pos.x;
    let newY = pos.y;

    switch (dir) {
      case 'UP': newY--; break;
      case 'DOWN': newY++; break;
      case 'LEFT': newX--; break;
      case 'RIGHT': newX++; break;
    }

    return !isWall(newX, newY);
  };

  const moveEntity = (pos: Position, dir: Direction): Position => {
    if (!dir) return pos;
    let newX = pos.x;
    let newY = pos.y;

    switch (dir) {
      case 'UP': newY--; break;
      case 'DOWN': newY++; break;
      case 'LEFT': newX--; break;
      case 'RIGHT': newX++; break;
    }

    if (newX < 0) newX = GRID_SIZE - 1;
    if (newX >= GRID_SIZE) newX = 0;

    return isWall(newX, newY) ? pos : { x: newX, y: newY };
  };

  const getDistance = (pos1: Position, pos2: Position): number => {
    return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y);
  };

  const getGhostDirection = (ghost: Position, target: Position): Direction => {
    const directions: Direction[] = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
    let bestDir: Direction = null;
    let bestDist = powerMode ? -Infinity : Infinity;

    for (const dir of directions) {
      const newPos = moveEntity(ghost, dir);
      if (newPos.x !== ghost.x || newPos.y !== ghost.y) {
        const dist = getDistance(newPos, target);
        if (powerMode ? dist > bestDist : dist < bestDist) {
          bestDist = dist;
          bestDir = dir;
        }
      }
    }

    return bestDir;
  };

  const checkCollision = useCallback((pacPos: Position, ghostPos: Position[]): boolean => {
    return ghostPos.some(g => g.x === pacPos.x && g.y === pacPos.y);
  }, []);

  const gameLoop = useCallback(() => {
    setPacman(prev => {
      let currentDir = direction;
      
      if (nextDirection && canMove(prev, nextDirection)) {
        currentDir = nextDirection;
        setDirection(nextDirection);
        setNextDirection(null);
      }

      const newPos = moveEntity(prev, currentDir);
      
      const posKey = `${newPos.x},${newPos.y}`;
      if (dots.has(posKey)) {
        setDots(prevDots => {
          const newDots = new Set(prevDots);
          newDots.delete(posKey);
          return newDots;
        });
        setScore(s => s + 10);
      }

      if (MAZE[newPos.y][newPos.x] === 'O') {
        setPowerMode(true);
        if (powerModeTimer) clearTimeout(powerModeTimer);
        const timer = setTimeout(() => setPowerMode(false), 7000);
        setPowerModeTimer(timer);
        setScore(s => s + 50);
      }

      return newPos;
    });

    setGhosts(prevGhosts => prevGhosts.map(ghost => {
      const dir = getGhostDirection(ghost, pacman);
      return moveEntity(ghost, dir);
    }));
  }, [direction, nextDirection, dots, canMove, moveEntity, pacman, powerMode, powerModeTimer]);

  useEffect(() => {
    if (gameState === 'playing') {
      gameLoopRef.current = setInterval(gameLoop, 1000 / FPS);
      return () => {
        if (gameLoopRef.current) clearInterval(gameLoopRef.current);
      };
    }
  }, [gameState, gameLoop]);

  useEffect(() => {
    const collision = checkCollision(pacman, ghosts);
    if (collision && gameState === 'playing') {
      if (powerMode) {
        setScore(s => s + 200);
      } else {
        setLives(l => {
          const newLives = l - 1;
          if (newLives <= 0) {
            setGameState('gameover');
          } else {
            setPacman({ x: 14, y: 23 });
            setGhosts(GHOSTS_START);
          }
          return newLives;
        });
      }
    }
  }, [pacman, ghosts, gameState, powerMode, checkCollision]);

  useEffect(() => {
    if (dots.size === 0 && gameState === 'playing') {
      initializeDots();
      setPacman({ x: 14, y: 23 });
      setGhosts(GHOSTS_START);
    }
  }, [dots, gameState, initializeDots]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (gameState !== 'playing') return;
      
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          setNextDirection('UP');
          break;
        case 'ArrowDown':
          e.preventDefault();
          setNextDirection('DOWN');
          break;
        case 'ArrowLeft':
          e.preventDefault();
          setNextDirection('LEFT');
          break;
        case 'ArrowRight':
          e.preventDefault();
          setNextDirection('RIGHT');
          break;
        case ' ':
          e.preventDefault();
          setGameState('paused');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gameState]);

  const startGame = () => {
    setGameState('playing');
    setScore(0);
    setLives(3);
    setPacman({ x: 14, y: 23 });
    setDirection(null);
    setNextDirection(null);
    setGhosts(GHOSTS_START);
    initializeDots();
    setPowerMode(false);
  };

  const resumeGame = () => {
    setGameState('playing');
  };

  return (
    <div className="min-h-screen bg-[#000000] flex items-center justify-center p-4 font-['Press_Start_2P']">
      <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />
      
      <div className="text-center">
        <h1 className="text-[#FFFF00] text-4xl mb-8 drop-shadow-[0_0_10px_#FFFF00]">
          PAC-MAN
        </h1>

        {gameState === 'menu' && (
          <div className="animate-fade-in">
            <div className="mb-8">
              <div className="text-[#FFB897] text-2xl mb-4">🟡</div>
              <p className="text-[#00FFFF] text-sm mb-2">Use Arrow Keys to Move</p>
              <p className="text-[#FFB8FF] text-sm mb-6">Press Space to Pause</p>
            </div>
            <Button
              onClick={startGame}
              className="bg-[#FFFF00] text-[#000000] hover:bg-[#FFB852] text-xl px-8 py-6 font-['Press_Start_2P']"
            >
              START GAME
            </Button>
          </div>
        )}

        {gameState === 'paused' && (
          <div className="animate-scale-in mb-8">
            <p className="text-[#FFFF00] text-2xl mb-6">PAUSED</p>
            <Button
              onClick={resumeGame}
              className="bg-[#FFFF00] text-[#000000] hover:bg-[#FFB852] text-xl px-8 py-6 font-['Press_Start_2P']"
            >
              RESUME
            </Button>
          </div>
        )}

        {gameState === 'gameover' && (
          <div className="animate-scale-in mb-8">
            <p className="text-[#FF0000] text-3xl mb-4">GAME OVER</p>
            <p className="text-[#FFFF00] text-xl mb-6">Score: {score}</p>
            <Button
              onClick={startGame}
              className="bg-[#FFFF00] text-[#000000] hover:bg-[#FFB852] text-xl px-8 py-6 font-['Press_Start_2P']"
            >
              PLAY AGAIN
            </Button>
          </div>
        )}

        {(gameState === 'playing' || gameState === 'paused') && (
          <>
            <div className="flex justify-center gap-8 mb-4 text-[#FFFF00] text-sm">
              <div>SCORE: {score}</div>
              <div>LIVES: {'🟡'.repeat(lives)}</div>
              {powerMode && <div className="text-[#00FFFF] animate-pulse">POWER!</div>}
            </div>

            <div 
              className="inline-block border-4 border-[#0000FF] relative"
              style={{
                width: GRID_SIZE * CELL_SIZE,
                height: GRID_HEIGHT * CELL_SIZE,
                backgroundColor: '#000000',
              }}
            >
              {MAZE.map((row, y) =>
                row.split('').map((cell, x) => {
                  if (cell === '#') {
                    return (
                      <div
                        key={`${x}-${y}`}
                        className="absolute"
                        style={{
                          left: x * CELL_SIZE,
                          top: y * CELL_SIZE,
                          width: CELL_SIZE,
                          height: CELL_SIZE,
                          backgroundColor: '#0000FF',
                          border: '1px solid #4169E1',
                        }}
                      />
                    );
                  }
                  if (cell === '.') {
                    const dotKey = `${x},${y}`;
                    if (dots.has(dotKey)) {
                      return (
                        <div
                          key={`dot-${x}-${y}`}
                          className="absolute rounded-full"
                          style={{
                            left: x * CELL_SIZE + CELL_SIZE / 2 - 2,
                            top: y * CELL_SIZE + CELL_SIZE / 2 - 2,
                            width: 4,
                            height: 4,
                            backgroundColor: '#FFB897',
                          }}
                        />
                      );
                    }
                  }
                  if (cell === 'O') {
                    return (
                      <div
                        key={`power-${x}-${y}`}
                        className="absolute rounded-full animate-pulse"
                        style={{
                          left: x * CELL_SIZE + CELL_SIZE / 2 - 4,
                          top: y * CELL_SIZE + CELL_SIZE / 2 - 4,
                          width: 8,
                          height: 8,
                          backgroundColor: '#FFB897',
                        }}
                      />
                    );
                  }
                  return null;
                })
              )}

              <div
                className="absolute rounded-full transition-all duration-100"
                style={{
                  left: pacman.x * CELL_SIZE + 2,
                  top: pacman.y * CELL_SIZE + 2,
                  width: CELL_SIZE - 4,
                  height: CELL_SIZE - 4,
                  backgroundColor: '#FFFF00',
                  boxShadow: '0 0 10px #FFFF00',
                }}
              />

              {ghosts.map((ghost, i) => (
                <div
                  key={`ghost-${i}`}
                  className="absolute rounded-t-full transition-all duration-100"
                  style={{
                    left: ghost.x * CELL_SIZE + 2,
                    top: ghost.y * CELL_SIZE + 2,
                    width: CELL_SIZE - 4,
                    height: CELL_SIZE - 4,
                    backgroundColor: powerMode ? '#0000FF' : GHOST_COLORS[i],
                    boxShadow: `0 0 10px ${powerMode ? '#0000FF' : GHOST_COLORS[i]}`,
                  }}
                >
                  <div className="absolute bottom-0 left-0 right-0 h-1/3 flex justify-around">
                    <div className="w-1/4 h-full bg-[#000000] rounded-b-full" />
                    <div className="w-1/4 h-full bg-[#000000] rounded-b-full" />
                    <div className="w-1/4 h-full bg-[#000000] rounded-b-full" />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Index;