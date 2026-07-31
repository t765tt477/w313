import { useState, useEffect, useRef, useCallback } from "react"
import { MessageCircle, Send, Headphones, Package } from "lucide-react"
import { chatAPI } from "../services/api"
import { getSocket } from "../services/socket"
import { playNotificationSound } from "../utils/sound"

interface Participant {
  user: { _id: string; name: string } | string
  model: "Admin" | "Driver" | "Client"
  role?: string
}

interface Conversation {
  _id: string
  type: "support" | "order"
  order?: string | null
  participants: Participant[]
  lastMessage?: { text: string; senderModel: string; createdAt: string }
  updatedAt: string
  unread?: boolean
}

interface Message {
  _id: string
  conversation: string
  sender: string
  senderModel: "Admin" | "Driver" | "Client"
  senderName: string
  text: string
  createdAt: string
}

interface ChatWidgetProps {
  token: string
  user: { id: string; role?: string } | null
  currentOrder?: { _id: string; status: string; driver?: any } | null
}

const conversationLabel = (conv: Conversation, myModel: string) => {
  if (conv.type === "support") return "الدعم الفني - وصل"
  const other = conv.participants.find((p) => p.model !== myModel)
  return other && typeof other.user === "object" ? `المندوب: ${other.user.name}` : "محادثة الطلب"
}

export default function ChatWidget({ token, user, currentOrder }: ChatWidgetProps) {
  const myModel = user?.role === "driver" ? "Driver" : "Client"
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState("")
  const [loadingList, setLoadingList] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const activeIdRef = useRef<string | null>(null)
  activeIdRef.current = activeId

  const hasActiveOrderChat = !!(currentOrder && currentOrder.driver &&
    ["accepted", "picked_up", "delivered"].includes(currentOrder.status))

  const refreshConversations = useCallback(async () => {
    setLoadingList(true)
    try {
      const res = await chatAPI.getConversations()
      let list: Conversation[] = res.data.conversations || []

      // Make sure the user always has a support conversation available to open.
      if (!list.some((c) => c.type === "support")) {
        try {
          const supportRes = await chatAPI.getSupportConversation()
          list = [supportRes.data.conversation, ...list]
        } catch { /* ignore - user may be an admin, or a transient error */ }
      }

      // If there's an active order with a driver assigned, make sure its chat exists too.
      if (hasActiveOrderChat && currentOrder && !list.some((c) => c.order === currentOrder._id)) {
        try {
          const orderRes = await chatAPI.getOrderConversation(currentOrder._id)
          list = [orderRes.data.conversation, ...list]
        } catch { /* ignore */ }
      }

      setConversations(list)
    } catch {
      /* keep whatever was already loaded */
    } finally {
      setLoadingList(false)
    }
  }, [hasActiveOrderChat, currentOrder])

  useEffect(() => {
    refreshConversations()
  }, [refreshConversations])

  const openConversation = (id: string) => {
    setActiveId(id)
    setLoadingMessages(true)
    chatAPI.getMessages(id)
      .then((res) => setMessages(res.data.messages || []))
      .catch(() => setMessages([]))
      .finally(() => setLoadingMessages(false))
    chatAPI.markRead(id).catch(() => { /* non-critical */ })
    setConversations((prev) => prev.map((c) => (c._id === id ? { ...c, unread: false } : c)))
    getSocket(token).emit("chat:join", { conversationId: id })
  }

  useEffect(() => {
    const socket = getSocket(token)

    const onMessage = (payload: Message) => {
      if (payload.conversation === activeIdRef.current) {
        setMessages((prev) => (prev.some((m) => m._id === payload._id) ? prev : [...prev, payload]))
      }
    }

    const onNewMessage = (payload: any) => {
      if (payload.senderModel !== myModel) playNotificationSound()
      setConversations((prev) => {
        const exists = prev.some((c) => c._id === payload.conversationId)
        if (!exists) {
          refreshConversations()
          return prev
        }
        const isOpen = payload.conversationId === activeIdRef.current
        return prev
          .map((c) => c._id === payload.conversationId
            ? { ...c, lastMessage: { text: payload.text, senderModel: payload.senderModel, createdAt: payload.createdAt }, updatedAt: payload.createdAt, unread: !isOpen }
            : c)
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      })
    }

    socket.on("chat:message", onMessage)
    socket.on("chat:new_message", onNewMessage)
    return () => {
      socket.off("chat:message", onMessage)
      socket.off("chat:new_message", onNewMessage)
    }
  }, [token, myModel, refreshConversations])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSend = () => {
    const text = draft.trim()
    if (!text || !activeId) return
    setDraft("")
    getSocket(token).emit("chat:message", { conversationId: activeId, text }, (ack: any) => {
      if (!ack?.ok) {
        console.error("Failed to send message:", ack?.message)
        setDraft(text)
      }
    })
  }

  const activeConversation = conversations.find((c) => c._id === activeId) || null

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-sm font-black text-slate-900 flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-green-600" />
          الدردشة
        </h1>
        <p className="text-slate-500 mt-1 text-sm">تواصل مع فريق الدعم أو مع المندوب أثناء التوصيل</p>
      </div>

      <div className="bg-white border border-slate-100 rounded-lg shadow-xs overflow-hidden flex flex-col" style={{ height: "70vh" }}>
        <div className="w-full border-b border-slate-400 bg-yellow-500/10 flex flex-col shrink-0">
          <div className="flex-1">
            {loadingList ? (
              <div className="p-4 text-center text-sm text-slate-400">جاري التحميل...</div>
            ) : conversations.length === 0 ? (
              <div className="p-4 text-center text-sm text-slate-400">لا توجد محادثات بعد</div>
            ) : (
              conversations.map((c) => (
                <button
                  key={c._id}
                  onClick={() => openConversation(c._id)}
                  className={`text-right px-3 py-3 border-b border-slate-50 flex items-start gap-2 ${activeId === c._id ? "" : ""}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${c.type === "support" ? "bg-yellow-100 text-yellow-700" : "bg-blue-100 text-blue-700"}`}>
                    {c.type === "support" ? <Headphones className="w-4 h-4" /> : <Package className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-xs text-slate-900 truncate">{conversationLabel(c, myModel)}</span>
                      {c.unread && <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />}
                    </div>
                    <p className="text-xs text-slate-500 truncate">{c.lastMessage?.text || "ابدأ المحادثة"}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {!activeConversation ? (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
              اختر محادثة من القائمة
            </div>
          ) : (
            <>
              {/* <div className="p-3 border-b border-slate-100">
                <span className="text-sm font-bold text-slate-800">{conversationLabel(activeConversation, myModel)}</span>
              </div> */}

              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
                {loadingMessages ? (
                  <div className="text-center text-sm text-slate-400">جاري تحميل الرسائل...</div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-sm text-slate-400">لا توجد رسائل بعد، ابدأ المحادثة</div>
                ) : (
                  messages.map((m) => {
                    const mine = m.senderModel === myModel
                    return (
                      <div key={m._id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${mine ? "bg-green-500 text-white rounded-br-sm" : "bg-white border border-slate-200 text-slate-800 rounded-bl-sm"}`}>
                          {!mine && <div className="text-[11px] font-bold opacity-60 mb-0.5">{m.senderName}</div>}
                          <div>{m.text}</div>
                          <div className={`text-[10px] mt-1 ${mine ? "text-white/70" : "text-slate-400"}`}>
                            {new Date(m.createdAt).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={bottomRef} />
              </div>

              <div className="p-3 border-t border-slate-100 flex items-center gap-2">
                <input
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSend() }}
                  placeholder="اكتب رسالتك..."
                  className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                />
                <button
                  onClick={handleSend}
                  disabled={!draft.trim()}
                  className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white p-2.5 rounded-xl transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
