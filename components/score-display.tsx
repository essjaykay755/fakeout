import { Card, CardContent } from "@/components/ui/card"

interface ScoreDisplayProps {
  score: number
}

export function ScoreDisplay({ score }: ScoreDisplayProps) {
  return (
    <Card className="bg-white">
      <CardContent className="p-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Score:</span>
          <span className="text-xl font-bold">{score}</span>
        </div>
      </CardContent>
    </Card>
  )
}

