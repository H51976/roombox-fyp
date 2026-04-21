"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";

interface Message {
  id: number;
  chat_room_id: number;
  sender_id: number;
  sender_name: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

interface ChatProps {
  chatRoomId: number;
  currentUserId: number;
  otherUserName: string;
  roomTitle?: string;
  onClose: () => void;
}

const API = "http://localhost:8000/api/v1/chat";

export default function Chat({ chatRoomId, currentUserId, otherUserName, roomTitle, onClose }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastIdRef = useRef<number>(0);

  // Load full history once, then poll for new messages
  const loadMessages = useCallback(async (full = false) => {
    try {
      const url = full
        ? `${API}/rooms/${chatRoomId}/messages?limit=100`
        : `${API}/rooms/${chatRoomId}/messages?limit=20&after_id=${lastIdRef.current}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        if (full) {
          setMessages(data.data);
          if (data.data.length > 0) lastIdRef.current = data.data[data.data.length - 1].id;
        } else {
          const fresh = data.data.filter((m: Message) => m.id > lastIdRef.current);
          if (fresh.length > 0) {
            setMessages((prev) => {
              const existing = new Set(prev.map((m) => m.id));
              const toAdd = fresh.filter((m: Message) => !existing.has(m.id));
              return [...prev, ...toAdd];
            });
            lastIdRef.current = fresh[fresh.length - 1].id;
          }
        }
      }
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  }, [chatRoomId]);

  useEffect(() => {
    loadMessages(true);
    // Poll every 2 seconds for new messages
    pollRef.current = setInterval(() => loadMessages(false), 2000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = newMessage.trim();
    if (!text || sending) return;
    setSending(true);
    setNewMessage("");
    try {
      const res = await fetch(`${API}/rooms/${chatRoomId}/messages?sender_id=${currentUserId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setMessages((prev) => {
          if (prev.find((m) => m.id === data.data.id)) return prev;
          return [...prev, data.data];
        });
        lastIdRef.current = Math.max(lastIdRef.current, data.data.id);
      } else {
        toast.error(data.message || "Failed to send message");
        setNewMessage(text);
      }
    } catch {
      toast.error("Failed to send message");
      setNewMessage(text);
    } finally {
      setSending(false);
    }
  };

  const fmt = (d: string) => {
    const date = new Date(d);
    const now = new Date();
    const mins = Math.floor((now.getTime() - date.getTime()) / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white w-full sm:rounded-2xl sm:shadow-2xl sm:max-w-lg h-[85vh] sm:h-[600px] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 px-5 py-4 flex items-center justify-between shrink-0">
          <div>
            <p className="text-xs text-blue-200 font-medium uppercase tracking-wide">Chat</p>
            <h3 className="text-white font-semibold leading-tight">{otherUserName}</h3>
            {roomTitle && <p className="text-blue-200 text-xs mt-0.5 truncate max-w-[240px]">{roomTitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-gray-500 text-sm">No messages yet. Say hi!</p>
            </div>
          ) : (
            messages.map((msg) => {
              const mine = msg.sender_id === currentUserId;
              return (
                <div key={msg.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] ${mine ? "items-end" : "items-start"} flex flex-col gap-1`}>
                    {!mine && (
                      <span className="text-xs font-medium text-gray-500 px-1">{msg.sender_name}</span>
                    )}
                    <div className={`px-4 py-2.5 rounded-2xl text-sm ${
                      mine
                        ? "bg-blue-600 text-white rounded-tr-sm"
                        : "bg-white text-gray-800 border border-gray-200 rounded-tl-sm shadow-sm"
                    }`}>
                      <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.message}</p>
                    </div>
                    <span className={`text-xs px-1 ${mine ? "text-right text-gray-400" : "text-gray-400"}`}>
                      {fmt(msg.created_at)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="px-4 py-3 border-t border-gray-100 bg-white shrink-0">
          <div className="flex gap-2 items-center">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 px-4 py-2.5 bg-gray-100 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || sending}
              className="w-10 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 flex items-center justify-center text-white transition-all shrink-0"
            >
              {sending ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
