import { CheckCheck, FileText } from 'lucide-react'
import type { Conversation, Message } from '../../types'
import { Avatar } from '../ui/Avatar'
import { cn } from '../../lib/utils'
import { SHARE_GROUPS } from './messageShareUtils'

interface MessageBubbleProps {
  message: Message
  contactAvatar: string
  contactName: string
}

export function MessageBubble({
  message: msg,
  contactAvatar,
  contactName,
}: MessageBubbleProps) {
  const isMe = msg.sender === 'me'

  return (
    <div
      className={cn(
        'flex items-end gap-2',
        isMe ? 'justify-end' : 'justify-start',
      )}
    >
      {!isMe && (
        <Avatar src={contactAvatar} alt={contactName} size="xs" />
      )}
      <div
        className={cn(
          'max-w-[75%] rounded-2xl px-4 py-2.5 text-xs shadow-xs leading-relaxed',
          isMe
            ? 'bg-[#2C4A3E] text-white rounded-br-xs'
            : 'bg-white border border-[#E8E4DC] text-[#191E1B] rounded-bl-xs',
        )}
      >
        {msg.attachment?.kind === 'health_record' ? (
          <div
            className={cn(
              'rounded-xl border px-3 py-2.5',
              isMe
                ? 'border-white/20 bg-white/10'
                : 'border-[#E8E4DC] bg-[#FAF8F5]',
            )}
          >
            <div className="flex items-start gap-2">
              <div
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
                  isMe ? 'bg-white/15 text-white' : 'bg-[#E0EAEC] text-[#234B54]',
                )}
              >
                <FileText size={13} />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="font-bold">{msg.attachment.title}</p>
                  {msg.attachment.category && (
                    <span
                      className={cn(
                        'rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide',
                        isMe
                          ? 'bg-white/15 text-white/90'
                          : 'bg-[#E0EAEC] text-[#234B54]',
                      )}
                    >
                      {
                        SHARE_GROUPS.find((g) => g.id === msg.attachment?.category)
                          ?.label
                      }
                    </span>
                  )}
                </div>
                <p
                  className={cn(
                    'mt-0.5',
                    isMe ? 'text-white/80' : 'text-[#5A6660]',
                  )}
                >
                  {msg.attachment.subtitle}
                </p>
                <p
                  className={cn(
                    'mt-1 text-[10px] font-medium',
                    isMe ? 'text-white/70' : 'text-[#7D8B82]',
                  )}
                >
                  {msg.attachment.date}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <p>{msg.text}</p>
        )}
        <div
          className={cn(
            'mt-1 flex items-center justify-end gap-1 text-[10px]',
            isMe ? 'text-white/70' : 'text-[#7D8B82]',
          )}
        >
          <span>{msg.time}</span>
          {isMe && <CheckCheck size={12} className="text-white/80" />}
        </div>
      </div>
    </div>
  )
}

interface MessageThreadProps {
  conversation: Conversation
  chatEndRef: React.RefObject<HTMLDivElement | null>
}

export function MessageThread({ conversation: active, chatEndRef }: MessageThreadProps) {
  return (
    <div className="flex-1 space-y-3.5 overflow-y-auto p-5">
      <div className="text-center my-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[#A3AEA7] bg-[#FAF8F5] px-3 py-1 rounded-full border border-[#E8E4DC]">
          Šifrovaný kanál péče o mazlíčky
        </span>
      </div>

      {active.messages.map((msg) => (
        <MessageBubble
          key={msg.id}
          message={msg}
          contactAvatar={active.avatar}
          contactName={active.name}
        />
      ))}
      <div ref={chatEndRef} />
    </div>
  )
}
