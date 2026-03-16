import { useRef, useEffect, useState } from 'react'
import { Send, Loader2 } from 'lucide-react'
import { cn } from '../lib/utils'
import { Button } from './ui/button'

export interface SetupChatMessage {
  role: 'assistant' | 'user'
  text: string
}

interface SetupChatProps {
  projectId: string
  messages: SetupChatMessage[]
  isStreaming: boolean
  streamingText: string
  sessionId: string | null
  onSendMessage: (text: string) => void
}

export function SetupChat({
  messages,
  isStreaming,
  streamingText,
  onSendMessage,
}: SetupChatProps) {
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom as new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingText])

  function handleSend() {
    const text = input.trim()
    if (!text || isStreaming) return
    setInput('')
    onSendMessage(text)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const hasContent = messages.length > 0 || isStreaming

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/30 flex-shrink-0">
        <h3 className="text-xs font-semibold text-foreground">Setup assistant</h3>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          Respond to prompts to configure your project
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto px-4 py-3 space-y-3">
        {!hasContent && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-2">
              <div className="w-8 h-8 rounded-full bg-dracula-purple/20 flex items-center justify-center mx-auto">
                <Loader2 className="w-4 h-4 text-dracula-purple animate-spin" />
              </div>
              <p className="text-xs text-muted-foreground">Setting up your project...</p>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              'flex',
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            <div
              className={cn(
                'max-w-[85%] rounded-lg px-3 py-2 text-xs',
                msg.role === 'user'
                  ? 'bg-dracula-purple/20 text-foreground'
                  : 'bg-muted/40 text-foreground'
              )}
            >
              <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
            </div>
          </div>
        ))}

        {/* Streaming text bubble */}
        {isStreaming && streamingText && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-lg px-3 py-2 text-xs bg-muted/40 text-foreground">
              <p className="whitespace-pre-wrap leading-relaxed">{streamingText}</p>
              <span className="inline-block w-1.5 h-3 bg-dracula-purple ml-0.5 animate-pulse" />
            </div>
          </div>
        )}

        {/* Streaming indicator when no text yet */}
        {isStreaming && !streamingText && (
          <div className="flex justify-start">
            <div className="rounded-lg px-3 py-2 bg-muted/40 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-dracula-purple animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-dracula-purple animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-dracula-purple animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-border/30 p-3">
        <div className="flex gap-2">
          <textarea
            className={cn(
              'flex-1 resize-none rounded-md border border-border/50 bg-background/50',
              'px-3 py-2 text-xs placeholder:text-muted-foreground',
              'focus:outline-none focus:ring-1 focus:ring-dracula-purple/50',
              'min-h-[36px] max-h-24'
            )}
            placeholder="Type a response..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isStreaming}
            rows={1}
          />
          <Button
            size="sm"
            variant="ghost"
            className="h-9 w-9 p-0 flex-shrink-0"
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
          >
            <Send className="w-3.5 h-3.5" />
          </Button>
        </div>
        <p className="text-[9px] text-muted-foreground mt-1.5">
          Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}
