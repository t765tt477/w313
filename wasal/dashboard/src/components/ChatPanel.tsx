import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, Send, Package, Headphones, User as UserIcon, Car } from 'lucide-react';
import { chatAPI } from '../services/api';
import { getSocket } from '../services/socket';
import { playNotificationSound } from '../utils/sound';

interface Participant {
  user: { _id: string; name: string; email?: string; role?: string; vehicleType?: string } | string;
  model: 'Admin' | 'Driver' | 'Client';
  role?: string;
}

interface Conversation {
  _id: string;
  type: 'support' | 'order';
  order?: string | null;
  participants: Participant[];
  lastMessage?: { text: string; senderModel: string; createdAt: string };
  status: string;
  updatedAt: string;
  unread?: boolean;
}

interface Message {
  _id: string;
  conversation: string;
  sender: string;
  senderModel: 'Admin' | 'Driver' | 'Client';
  senderName: string;
  text: string;
  createdAt: string;
}

const otherParticipants = (conv: Conversation) =>
  conv.participants.filter((p) => p.model !== 'Admin' && typeof p.user === 'object');

const conversationTitle = (conv: Conversation) => {
  const others = otherParticipants(conv);
  if (others.length === 0) return conv.type === 'support' ? 'محادثة دعم' : 'محادثة طلب';
  return others.map((p) => (typeof p.user === 'object' ? p.user.name : '')).join(' \u2194 ');
};

export default function ChatPanel() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [loadingList, setLoadingList] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState<'all' | 'support' | 'order'>('all');
  const bottomRef = useRef<HTMLDivElement>(null);
  const activeIdRef = useRef<string | null>(null);
  activeIdRef.current = activeId;

  const loadConversations = useCallback(() => {
    setLoadingList(true);
    chatAPI.getConversations()
      .then((res) => setConversations(res.data.conversations || []))
      .catch(() => { /* keep whatever was already loaded */ })
      .finally(() => setLoadingList(false));
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const openConversation = (id: string) => {
    setActiveId(id);
    setLoadingMessages(true);
    chatAPI.getMessages(id)
      .then((res) => setMessages(res.data.messages || []))
      .catch(() => setMessages([]))
      .finally(() => setLoadingMessages(false));
    chatAPI.markRead(id).catch(() => { /* non-critical */ });
    setConversations((prev) => prev.map((c) => (c._id === id ? { ...c, unread: false } : c)));

    const token = localStorage.getItem('adminToken');
    if (token) {
      getSocket(token).emit('chat:join', { conversationId: id });
    }
  };

  // Real-time: new messages in the open thread, plus inbox-wide badge updates.
  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) return;
    const socket = getSocket(token);

    const onMessage = (payload: Message) => {
      if (payload.conversation === activeIdRef.current) {
        setMessages((prev) => (prev.some((m) => m._id === payload._id) ? prev : [...prev, payload]));
      }
    };

    const onNewMessage = (payload: any) => {
      if (payload.senderModel !== 'Admin') playNotificationSound();
      setConversations((prev) => {
        const exists = prev.some((c) => c._id === payload.conversationId);
        const isOpen = payload.conversationId === activeIdRef.current;
        if (!exists) {
          loadConversations();
          return prev;
        }
        return prev
          .map((c) => c._id === payload.conversationId
            ? { ...c, lastMessage: { text: payload.text, senderModel: payload.senderModel, createdAt: payload.createdAt }, updatedAt: payload.createdAt, unread: !isOpen }
            : c)
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      });
    };

    socket.on('chat:message', onMessage);
    socket.on('chat:new_message', onNewMessage);
    return () => {
      socket.off('chat:message', onMessage);
      socket.off('chat:new_message', onNewMessage);
    };
  }, [loadConversations]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || !activeId) return;
    setSending(true);
    setDraft('');
    try {
      const token = localStorage.getItem('adminToken');
      if (token) {
        getSocket(token).emit('chat:message', { conversationId: activeId, text }, (ack: any) => {
          if (!ack?.ok) console.error('Failed to send message:', ack?.message);
        });
      } else {
        await chatAPI.sendMessage(activeId, text);
      }
    } catch (err) {
      console.error('Failed to send message', err);
      setDraft(text);
    } finally {
      setSending(false);
    }
  };

  const filtered = conversations.filter((c) => filter === 'all' || c.type === filter);
  const activeConversation = conversations.find((c) => c._id === activeId) || null;

  return (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden" style={{ height: 'calc(100vh - 140px)' }}>
      <div className="flex h-full">
        {/* Conversation list */}
        <div className="w-80 border-l border-slate-100 flex flex-col shrink-0">
          <div className="p-3 border-b border-slate-100">
            <h2 className="font-black text-slate-900 flex items-center gap-2 mb-2">
              <MessageCircle className="w-5 h-5 text-green-600" />
              الدردشة الداخلية
            </h2>
            <div className="flex gap-1">
              {(['all', 'support', 'order'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${filter === f ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                >
                  {f === 'all' ? 'الكل' : f === 'support' ? 'دعم' : 'طلبات'}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loadingList ? (
              <div className="p-4 text-center text-sm text-slate-400">جاري التحميل...</div>
            ) : filtered.length === 0 ? (
              <div className="p-4 text-center text-sm text-slate-400">لا توجد محادثات بعد</div>
            ) : (
              filtered.map((c) => (
                <button
                  key={c._id}
                  onClick={() => openConversation(c._id)}
                  className={`w-full text-right px-3 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors flex items-start gap-2 ${activeId === c._id ? 'bg-green-50' : ''}`}
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${c.type === 'support' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>
                    {c.type === 'support' ? <Headphones className="w-4 h-4" /> : <Package className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-sm text-slate-900 truncate">{conversationTitle(c)}</span>
                      {c.unread && <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />}
                    </div>
                    <p className="text-xs text-slate-500 truncate">{c.lastMessage?.text || 'لا توجد رسائل بعد'}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Thread */}
        <div className="flex-1 flex flex-col min-w-0">
          {!activeConversation ? (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
              اختر محادثة من القائمة لعرضها
            </div>
          ) : (
            <>
              <div className="p-3 border-b border-slate-100 flex items-center gap-2">
                {otherParticipants(activeConversation).map((p, i) => (
                  <span key={i} className="flex items-center gap-1 text-sm font-bold text-slate-800">
                    {p.model === 'Driver' ? <Car className="w-4 h-4 text-blue-600" /> : <UserIcon className="w-4 h-4 text-green-600" />}
                    {typeof p.user === 'object' ? p.user.name : ''}
                  </span>
                ))}
                <span className="text-xs text-slate-400 mr-auto">
                  {activeConversation.type === 'support' ? 'تذكرة دعم' : 'دردشة طلب'}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
                {loadingMessages ? (
                  <div className="text-center text-sm text-slate-400">جاري تحميل الرسائل...</div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-sm text-slate-400">لا توجد رسائل بعد، ابدأ المحادثة</div>
                ) : (
                  messages.map((m) => {
                    const mineByModel = m.senderModel === 'Admin';
                    return (
                      <div key={m._id} className={`flex ${mineByModel ? 'justify-start' : 'justify-end'}`}>
                        <div className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm ${mineByModel ? 'bg-green-500 text-white rounded-bl-sm' : 'bg-white border border-slate-200 text-slate-800 rounded-br-sm'}`}>
                          {!mineByModel && <div className="text-[11px] font-bold opacity-60 mb-0.5">{m.senderName}</div>}
                          <div>{m.text}</div>
                          <div className={`text-[10px] mt-1 ${mineByModel ? 'text-white/70' : 'text-slate-400'}`}>
                            {new Date(m.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={bottomRef} />
              </div>

              <div className="p-3 border-t border-slate-100 flex items-center gap-2">
                <input
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !sending) handleSend(); }}
                  placeholder="اكتب رسالتك..."
                  className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                />
                <button
                  onClick={handleSend}
                  disabled={sending || !draft.trim()}
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
  );
}
