"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { RotateCcw, Volume2, VolumeX } from "lucide-react"

type CellValue = {
  emoji: string
  player: 1 | 2
  turnsLeft: number
  id: string
}

type GameState = "playing" | "won" | "draw"

const PLAYER_EMOJIS = {
  1: ["🔥", "⚡", "💫", "🌟", "✨"],
  2: ["🌊", "❄️", "🌙", "💎", "🔮"],
}

const BLINK_DURATION = 3 // Emojis vanish after 3 turns
const MAX_EMOJIS_PER_PLAYER = 6

export default function BlinkTacToe() {
  const [board, setBoard] = useState<(CellValue | null)[]>(Array(9).fill(null))
  const [currentPlayer, setCurrentPlayer] = useState<1 | 2>(1)
  const [gameState, setGameState] = useState<GameState>("playing")
  const [winner, setWinner] = useState<1 | 2 | null>(null)
  const [emojiCounts, setEmojiCounts] = useState({ 1: 0, 2: 0 })
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [gameStats, setGameStats] = useState({ moves: 0, vanishedEmojis: 0 })

  // Sound effects
  const playSound = useCallback(
    (type: "place" | "vanish" | "win" | "draw") => {
      if (!soundEnabled) return

      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      switch (type) {
        case "place":
          oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
          oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.1)
          break
        case "vanish":
          oscillator.frequency.setValueAtTime(200, audioContext.currentTime)
          oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.2)
          break
        case "win":
          oscillator.frequency.setValueAtTime(523, audioContext.currentTime)
          oscillator.frequency.setValueAtTime(659, audioContext.currentTime + 0.1)
          oscillator.frequency.setValueAtTime(784, audioContext.currentTime + 0.2)
          break
        case "draw":
          oscillator.frequency.setValueAtTime(300, audioContext.currentTime)
          break
      }

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)

      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.3)
    },
    [soundEnabled],
  )

  // Check for winner
  const checkWinner = useCallback((board: (CellValue | null)[]) => {
    const lines = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8], // rows
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8], // columns
      [0, 4, 8],
      [2, 4, 6], // diagonals
    ]

    for (const [a, b, c] of lines) {
      if (
        board[a] &&
        board[b] &&
        board[c] &&
        board[a]!.player === board[b]!.player &&
        board[b]!.player === board[c]!.player
      ) {
        return board[a]!.player
      }
    }
    return null
  }, [])

  // Age emojis and remove expired ones
  const ageEmojis = useCallback(() => {
    setBoard((prevBoard) => {
      const newBoard = prevBoard.map((cell) => {
        if (cell && cell.turnsLeft > 0) {
          return { ...cell, turnsLeft: cell.turnsLeft - 1 }
        }
        return cell
      })

      // Remove expired emojis
      const vanishedCount = newBoard.filter((cell, index) => cell && cell.turnsLeft === 0 && prevBoard[index]).length

      if (vanishedCount > 0) {
        playSound("vanish")
        setGameStats((prev) => ({ ...prev, vanishedEmojis: prev.vanishedEmojis + vanishedCount }))
      }

      return newBoard.map((cell) => (cell && cell.turnsLeft === 0 ? null : cell))
    })
  }, [playSound])

  // Handle cell click
  const handleCellClick = (index: number) => {
    if (board[index] || gameState !== "playing" || emojiCounts[currentPlayer] >= MAX_EMOJIS_PER_PLAYER) {
      return
    }

    const randomEmoji = PLAYER_EMOJIS[currentPlayer][Math.floor(Math.random() * PLAYER_EMOJIS[currentPlayer].length)]

    const newCell: CellValue = {
      emoji: randomEmoji,
      player: currentPlayer,
      turnsLeft: BLINK_DURATION,
      id: `${currentPlayer}-${Date.now()}-${Math.random()}`,
    }

    const newBoard = [...board]
    newBoard[index] = newCell

    setBoard(newBoard)
    setEmojiCounts((prev) => ({ ...prev, [currentPlayer]: prev[currentPlayer] + 1 }))
    setGameStats((prev) => ({ ...prev, moves: prev.moves + 1 }))
    playSound("place")

    // Check for winner
    const winner = checkWinner(newBoard)
    if (winner) {
      setWinner(winner)
      setGameState("won")
      playSound("win")
      return
    }

    // Check for draw
    if (newBoard.every((cell) => cell !== null)) {
      setGameState("draw")
      playSound("draw")
      return
    }

    // Switch player and age emojis
    setCurrentPlayer(currentPlayer === 1 ? 2 : 1)
    setTimeout(ageEmojis, 500)
  }

  // Reset game
  const resetGame = () => {
    setBoard(Array(9).fill(null))
    setCurrentPlayer(1)
    setGameState("playing")
    setWinner(null)
    setEmojiCounts({ 1: 0, 2: 0 })
    setGameStats({ moves: 0, vanishedEmojis: 0 })
  }

  // Check for winner after emoji aging
  useEffect(() => {
    if (gameState === "playing") {
      const winner = checkWinner(board)
      if (winner) {
        setWinner(winner)
        setGameState("won")
        playSound("win")
      } else if (board.every((cell) => cell === null) && gameStats.moves > 0) {
        setGameState("draw")
        playSound("draw")
      }
    }
  }, [board, gameState, checkWinner, playSound, gameStats.moves])

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-4xl mx-auto">
        <Card className="mb-6 bg-white/10 backdrop-blur-md border-white/20">
          <CardHeader className="text-center">
            <CardTitle className="text-4xl font-bold text-white mb-2">✨ Blink Tac Toe ✨</CardTitle>
            <p className="text-white/80">Emojis vanish after {BLINK_DURATION} turns! Use strategy and timing to win!</p>
          </CardHeader>
        </Card>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Game Board */}
          <div className="lg:col-span-2">
            <Card className="bg-white/10 backdrop-blur-md border-white/20">
              <CardContent className="p-6">
                <div className="grid grid-cols-3 gap-3 mb-6">
                  {board.map((cell, index) => (
                    <button
                      key={index}
                      onClick={() => handleCellClick(index)}
                      className={`
                        aspect-square rounded-xl border-2 text-4xl font-bold
                        transition-all duration-300 transform hover:scale-105
                        ${
                          cell
                            ? "bg-white/20 border-white/40 cursor-default"
                            : "bg-white/5 border-white/20 hover:bg-white/15 hover:border-white/40 cursor-pointer"
                        }
                        ${cell && cell.turnsLeft === 1 ? "animate-pulse bg-red-500/30" : ""}
                        ${
                          gameState !== "playing" || emojiCounts[currentPlayer] >= MAX_EMOJIS_PER_PLAYER
                            ? "cursor-not-allowed opacity-50"
                            : ""
                        }
                      `}
                      disabled={
                        !!cell || gameState !== "playing" || emojiCounts[currentPlayer] >= MAX_EMOJIS_PER_PLAYER
                      }
                    >
                      <div className="flex flex-col items-center justify-center h-full">
                        {cell && (
                          <>
                            <span
                              className={`transition-all duration-300 ${cell.turnsLeft <= 1 ? "animate-bounce" : ""}`}
                            >
                              {cell.emoji}
                            </span>
                            <span className="text-xs text-white/60 mt-1">{cell.turnsLeft}</span>
                          </>
                        )}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Game Status */}
                <div className="text-center">
                  {gameState === "playing" && (
                    <div className="text-white">
                      <p className="text-xl mb-2">Player {currentPlayer}'s Turn</p>
                      <div className="flex justify-center gap-2 mb-4">
                        {PLAYER_EMOJIS[currentPlayer].map((emoji, index) => (
                          <span key={index} className="text-2xl animate-pulse">
                            {emoji}
                          </span>
                        ))}
                      </div>
                      {emojiCounts[currentPlayer] >= MAX_EMOJIS_PER_PLAYER && (
                        <Badge variant="destructive" className="mb-2">
                          Emoji limit reached! Wait for some to vanish.
                        </Badge>
                      )}
                    </div>
                  )}

                  {gameState === "won" && (
                    <div className="text-center">
                      <p className="text-3xl font-bold text-yellow-400 mb-2 animate-bounce">
                        🎉 Player {winner} Wins! 🎉
                      </p>
                      <div className="flex justify-center gap-2 mb-4">
                        {PLAYER_EMOJIS[winner!].map((emoji, index) => (
                          <span key={index} className="text-3xl animate-spin">
                            {emoji}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {gameState === "draw" && (
                    <p className="text-2xl font-bold text-orange-400 animate-pulse">🤝 It's a Draw! 🤝</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Game Info */}
          <div className="space-y-4">
            {/* Player Stats */}
            <Card className="bg-white/10 backdrop-blur-md border-white/20">
              <CardHeader>
                <CardTitle className="text-white text-lg">Player Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-white">Player 1</span>
                    <Badge variant={currentPlayer === 1 ? "default" : "secondary"}>
                      {emojiCounts[1]}/{MAX_EMOJIS_PER_PLAYER}
                    </Badge>
                  </div>
                  <div className="flex gap-1">
                    {PLAYER_EMOJIS[1].map((emoji, index) => (
                      <span key={index} className="text-lg">
                        {emoji}
                      </span>
                    ))}
                  </div>
                </div>

                <Separator className="bg-white/20" />

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-white">Player 2</span>
                    <Badge variant={currentPlayer === 2 ? "default" : "secondary"}>
                      {emojiCounts[2]}/{MAX_EMOJIS_PER_PLAYER}
                    </Badge>
                  </div>
                  <div className="flex gap-1">
                    {PLAYER_EMOJIS[2].map((emoji, index) => (
                      <span key={index} className="text-lg">
                        {emoji}
                      </span>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Game Stats */}
            <Card className="bg-white/10 backdrop-blur-md border-white/20">
              <CardHeader>
                <CardTitle className="text-white text-lg">Game Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-white">
                  <span>Total Moves:</span>
                  <Badge>{gameStats.moves}</Badge>
                </div>
                <div className="flex justify-between text-white">
                  <span>Vanished Emojis:</span>
                  <Badge variant="destructive">{gameStats.vanishedEmojis}</Badge>
                </div>
                <div className="flex justify-between text-white">
                  <span>Active Emojis:</span>
                  <Badge variant="secondary">{board.filter((cell) => cell !== null).length}</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Controls */}
            <Card className="bg-white/10 backdrop-blur-md border-white/20">
              <CardContent className="p-4 space-y-3">
                <Button onClick={resetGame} className="w-full" variant="outline">
                  <RotateCcw className="w-4 h-4 mr-2" />
                  New Game
                </Button>

                <Button onClick={() => setSoundEnabled(!soundEnabled)} variant="outline" className="w-full">
                  {soundEnabled ? (
                    <>
                      <Volume2 className="w-4 h-4 mr-2" />
                      Sound On
                    </>
                  ) : (
                    <>
                      <VolumeX className="w-4 h-4 mr-2" />
                      Sound Off
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Rules */}
            <Card className="bg-white/10 backdrop-blur-md border-white/20">
              <CardHeader>
                <CardTitle className="text-white text-lg">How to Play</CardTitle>
              </CardHeader>
              <CardContent className="text-white/80 text-sm space-y-2">
                <p>• Click empty cells to place random emojis</p>
                <p>• Emojis vanish after {BLINK_DURATION} turns</p>
                <p>• Max {MAX_EMOJIS_PER_PLAYER} emojis per player</p>
                <p>• Get 3 in a row to win!</p>
                <p>• Use strategy and timing wisely</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
