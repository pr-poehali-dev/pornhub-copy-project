import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';

const GRID_SIZE = 20;

type Position = { x: number; y: number };
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

const MAZE = [
  '####################',
  '#........#.........#',
  '#.##.###.#.###.##.#',
  '#.................#',
  '#.##.#.#####.#.##.#',
  '#....#...#...#....#',
  '####.### # ###.####',
  '   #.#       #.#   ',
  '####.# ##### #.####',
  '    .  #   #  .    ',
  '####.# ##### #.####',
  '   #.#       #.#   ',
  '####.# ##### #.####',
  '#.........#........#',
  '#.##.###.#.###.##.#',
  '#..#.....P.....#..#',
  '##.#.#.#####.#.#.##',
  '#....#...#...#....#',
  '#.######.#.######.#',
  '####################',
];

const GHOSTS_START: Position[] = [
  { x: 9, y: 7 },
  { x: 10, y: 7 },
  { x: 9, y: 8 },
  { x: 10, y: 8 },
];

const Index = () => {
  const [cellSize, setCellSize] = useState(20);
  const [pacman, setPacman] = useState<Position>({ x: 9, y: 15 });
  const [direction, setDirection] = useState<Direction>('RIGHT');
  const [ghosts, setGhosts] = useState<Position[]>(GHOSTS_START);
  const [dots, setDots] = useState<boolean[][]>([]);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);

  useEffect(() => {
    const updateCellSize = () => {
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      const maxWidth = Math.min(screenWidth - 32, 600);
      const maxHeight = Math.min(screenHeight - 300, 600);
      const size = Math.floor(Math.min(maxWidth, maxHeight) / GRID_SIZE);
      setCellSize(Math.max(size, 12));
    };

    updateCellSize();
    window.addEventListener('resize', updateCellSize);
    return () => window.removeEventListener('resize', updateCellSize);
  }, []);

  useEffect(() => {
    const initialDots = MAZE.map((row, y) =>
      row.split('').map((cell, x) => cell === '.' || cell === 'P')
    );
    setDots(initialDots);
  }, []);

  const isWall = (x: number, y: number) => {
    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return true;
    return MAZE[y][x] === '#';
  };

  const movePacman = useCallback(() => {
    if (gameOver || gameWon) return;

    const moves: Record<Direction, Position> = {
      UP: { x: pacman.x, y: pacman.y - 1 },
      DOWN: { x: pacman.x, y: pacman.y + 1 },
      LEFT: { x: pacman.x - 1, y: pacman.y },
      RIGHT: { x: pacman.x + 1, y: pacman.y },
    };

    const newPos = moves[direction];
    if (!isWall(newPos.x, newPos.y)) {
      setPacman(newPos);

      if (dots[newPos.y]?.[newPos.x]) {
        setDots(prev => {
          const updated = [...prev];
          updated[newPos.y] = [...updated[newPos.y]];
          updated[newPos.y][newPos.x] = false;
          return updated;
        });
        setScore(prev => prev + 10);
      }
    }
  }, [pacman, direction, gameOver, gameWon, dots]);

  const moveGhosts = useCallback(() => {
    if (gameOver || gameWon) return;

    setGhosts(prev =>
      prev.map(ghost => {
        const directions: Direction[] = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
        const validMoves = directions
          .map(dir => {
            const moves: Record<Direction, Position> = {
              UP: { x: ghost.x, y: ghost.y - 1 },
              DOWN: { x: ghost.x, y: ghost.y + 1 },
              LEFT: { x: ghost.x - 1, y: ghost.y },
              RIGHT: { x: ghost.x + 1, y: ghost.y },
            };
            return moves[dir];
          })
          .filter(pos => !isWall(pos.x, pos.y));

        if (validMoves.length === 0) return ghost;
        return validMoves[Math.floor(Math.random() * validMoves.length)];
      })
    );
  }, [gameOver, gameWon]);

  useEffect(() => {
    const pacmanInterval = setInterval(movePacman, 200);
    return () => clearInterval(pacmanInterval);
  }, [movePacman]);

  useEffect(() => {
    const ghostInterval = setInterval(moveGhosts, 300);
    return () => clearInterval(ghostInterval);
  }, [moveGhosts]);

  useEffect(() => {
    const collision = ghosts.some(
      ghost => ghost.x === pacman.x && ghost.y === pacman.y
    );
    if (collision) {
      setGameOver(true);
    }
  }, [ghosts, pacman]);

  useEffect(() => {
    const allDotsEaten = dots.every(row => row.every(dot => !dot));
    if (allDotsEaten && dots.length > 0) {
      setGameWon(true);
    }
  }, [dots]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
          setDirection('UP');
          break;
        case 'ArrowDown':
          setDirection('DOWN');
          break;
        case 'ArrowLeft':
          setDirection('LEFT');
          break;
        case 'ArrowRight':
          setDirection('RIGHT');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  const resetGame = () => {
    setPacman({ x: 9, y: 15 });
    setDirection('RIGHT');
    setGhosts(GHOSTS_START);
    setScore(0);
    setGameOver(false);
    setGameWon(false);
    const initialDots = MAZE.map((row, y) =>
      row.split('').map((cell, x) => cell === '.' || cell === 'P')
    );
    setDots(initialDots);
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-start p-2 sm:p-8 sm:justify-center overflow-hidden">
      <div className="flex flex-col items-center gap-2 sm:gap-6 w-full max-w-screen-sm">
        <div className="text-center py-2">
          <h1 className="text-2xl sm:text-5xl font-bold mb-1 sm:mb-2 text-yellow-400 retro-text">PAC-MAN</h1>
          <p className="text-lg sm:text-2xl text-white">Счёт: {score}</p>
        </div>

        <Card className="bg-gray-900 p-0.5 sm:p-1 border-2 sm:border-4 border-blue-600 touch-none">
          <div
            className="relative"
            style={{
              width: GRID_SIZE * cellSize,
              height: GRID_SIZE * cellSize,
            }}
          >
            {MAZE.map((row, y) =>
              row.split('').map((cell, x) => (
                <div
                  key={`${x}-${y}`}
                  className="absolute"
                  style={{
                    left: x * cellSize,
                    top: y * cellSize,
                    width: cellSize,
                    height: cellSize,
                  }}
                >
                  {cell === '#' && (
                    <div className="w-full h-full bg-blue-600 border border-blue-400" />
                  )}
                  {dots[y]?.[x] && (
                    <div className="w-full h-full flex items-center justify-center">
                      <div 
                        className="bg-yellow-200 rounded-full"
                        style={{
                          width: Math.max(cellSize * 0.2, 2),
                          height: Math.max(cellSize * 0.2, 2),
                        }}
                      />
                    </div>
                  )}
                </div>
              ))
            )}

            <div
              className="absolute transition-all duration-200"
              style={{
                left: pacman.x * cellSize,
                top: pacman.y * cellSize,
                width: cellSize,
                height: cellSize,
              }}
            >
              <div 
                className="w-full h-full bg-yellow-400 rounded-full flex items-center justify-center"
                style={{ fontSize: Math.max(cellSize * 0.6, 10) }}
              >
                {direction === 'RIGHT' && '▶'}
                {direction === 'LEFT' && '◀'}
                {direction === 'UP' && '▲'}
                {direction === 'DOWN' && '▼'}
              </div>
            </div>

            {ghosts.map((ghost, i) => (
              <div
                key={i}
                className="absolute transition-all duration-300"
                style={{
                  left: ghost.x * cellSize,
                  top: ghost.y * cellSize,
                  width: cellSize,
                  height: cellSize,
                }}
              >
                <div
                  className={`w-full h-full rounded-t-full flex items-center justify-center ${
                    i === 0 ? 'bg-red-500' : i === 1 ? 'bg-pink-500' : i === 2 ? 'bg-cyan-500' : 'bg-orange-500'
                  }`}
                  style={{ fontSize: Math.max(cellSize * 0.6, 10) }}
                >
                  👻
                </div>
              </div>
            ))}

            {(gameOver || gameWon) && (
              <div className="absolute inset-0 bg-black bg-opacity-80 flex items-center justify-center">
                <div className="text-center px-4">
                  <h2 className="text-2xl sm:text-4xl font-bold mb-2 sm:mb-4 text-yellow-400">
                    {gameWon ? '🎉 ПОБЕДА!' : '💀 GAME OVER'}
                  </h2>
                  <p className="text-xl sm:text-2xl text-white mb-4 sm:mb-6">Счёт: {score}</p>
                  <Button onClick={resetGame} size="lg" className="bg-yellow-400 text-black hover:bg-yellow-500">
                    Играть снова
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>

        <div className="grid grid-cols-3 gap-2 w-48 sm:w-64 mt-2">
          <div className="col-start-2">
            <Button
              onClick={() => setDirection('UP')}
              className="w-full h-12 sm:h-16 bg-blue-600 hover:bg-blue-700 text-white"
              size="lg"
            >
              <Icon name="ChevronUp" size={24} />
            </Button>
          </div>
          <Button
            onClick={() => setDirection('LEFT')}
            className="w-full h-12 sm:h-16 bg-blue-600 hover:bg-blue-700 text-white col-start-1 row-start-2"
            size="lg"
          >
            <Icon name="ChevronLeft" size={24} />
          </Button>
          <Button
            onClick={() => setDirection('DOWN')}
            className="w-full h-12 sm:h-16 bg-blue-600 hover:bg-blue-700 text-white col-start-2 row-start-2"
            size="lg"
          >
            <Icon name="ChevronDown" size={24} />
          </Button>
          <Button
            onClick={() => setDirection('RIGHT')}
            className="w-full h-12 sm:h-16 bg-blue-600 hover:bg-blue-700 text-white col-start-3 row-start-2"
            size="lg"
          >
            <Icon name="ChevronRight" size={24} />
          </Button>
        </div>

        <div className="text-center text-white text-sm sm:text-lg pb-2">
          <p className="hidden sm:block">Используйте стрелки ← → ↑ ↓ для управления</p>
          <p className="sm:hidden">Нажимайте на стрелки для управления</p>
        </div>

        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
          .retro-text {
            font-family: 'Press Start 2P', cursive;
            text-shadow: 0 0 10px #ffd700, 0 0 20px #ffd700;
          }
        `}</style>
      </div>
    </div>
  );
};

export default Index;
