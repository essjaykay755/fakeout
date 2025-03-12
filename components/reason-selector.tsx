"use client"

import { Button } from "@/components/ui/button"

interface ReasonSelectorProps {
  reasons: string[]
  onSelect: (reason: string) => void
}

export function ReasonSelector({ reasons, onSelect }: ReasonSelectorProps) {
  return (
    <div className="w-full space-y-4">
      <h3 className="text-lg font-medium">Why do you think this article is fake?</h3>
      <div className="grid gap-3">
        {reasons.map((reason) => (
          <Button key={reason} variant="outline" className="justify-start text-left" onClick={() => onSelect(reason)}>
            {reason}
          </Button>
        ))}
      </div>
    </div>
  )
}

