"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";

const API = "http://localhost:8000/api/v1";

interface ChatRoom {
  id: number;
  tenant_id: number;
  landlord_id: number;
  room_id: number | null;
  tenant_name: string;
  landlord_name: string;
  room_title: string | null;
  last_message: string | null;
  last_message_time: string | null;
  unread_count: number;
  created_at: string;
}

interface Message {
  id: number;
  chat_room_id: number;
  sender_id: number;
  sender_name: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

interface User {
  id: string;
  email: string;
  full_name?: string;
  user_type?: string;
}

function timeAgo(d: string) {
  const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function TenantMessagesPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [activeChatRoom, setActiveChatRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastIdRef = useRef<number>(0);

  /* ── auth ── */
  useEffect(() => {
    const userStr = localStorage.getItem("user");
    const token = localStorage.getItem("auth_token");
    if (!userStr || !token) { router.push("/login"); return; }
    try {
      const u = JSON.parse(userStr);
      setUser(u);
    } catch {
      router.push("/login");
    }
  }, [router]);

  /* ── load chat rooms ── */
  const loadChatRooms = useCallback(async (uid: string) => {
    try {
      const res = await fetch(`${API}/chat/rooms?user_id=${uid}`);
      const data = await res.json();
      if (data.success) setChatRooms(data.data || []);
    } catch {}
    finally { setLoadingRooms(false); }
  }, []);

  useEffect(() => {
    if (user) loadChatRooms(user.id);
  }, [user, loadChatRooms]);

  /* ── load messages for active room ── */
  const loadMessages = useCallback(async (chatRoomId: number, full = false) => {
    try {
      const url = full
        ? `${API}/chat/rooms/${chatRoomId}/messages?limit=100`
        : `${API}/chat/rooms/${chatRoomId}/messages?limit=20&after_id=${lastIdRef.current}`;
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
              const ids = new Set(prev.map((m) => m.id));
              return [...prev, ...fresh.filter((m: Message) => !ids.has(m.id))];
            });
            lastIdRef.current = fresh[fresh.length - 1].id;
          }
        }
      }
    } catch {}
    finally { setLoadingMessages(false); }
  }, []);

  /* ── switch active chat room ── */
  const openRoom = useCallback(async (room: ChatRoom) => {
    setActiveChatRoom(room);
    setMessages([]);
    lastIdRef.current = 0;
    setLoadingMessages(true);
    if (pollRef.current) clearInterval(pollRef.current);
    await loadMessages(room.id, true);
    pollRef.current = setInterval(() => loadMessages(room.id, false), 2000);
    // Mark as read locally
    setChatRooms((prev) => prev.map((r) => r.id === room.id ? { ...r, unread_count: 0 } : r));
  }, [loadMessages]);

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ── send ── */
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = newMessage.trim();
    if (!text || sending || !activeChatRoom || !user) return;
    setSending(true);
    setNewMessage("");
    try {
      const res = await fetch(
        `${API}/chat/rooms/${activeChatRoom.id}/messages?sender_id=${user.id}`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: text }) }
      );
      const data = await res.json();
      if (data.success && data.data) {
        setMessages((prev) => prev.find((m) => m.id === data.data.id) ? prev : [...prev, data.data]);
        lastIdRef.current = Math.max(lastIdRef.current, data.data.id);
        setChatRooms((prev) => prev.map((r) => r.id === activeChatRoom.id ? { ...r, last_message: text, last_message_time: new Date().toISOString() } : r));
      } else {
        toast.error(data.message || "Failed to send");
        setNewMessage(text);
      }
    } catch {
      toast.error("Connection error");
      setNewMessage(text);
    } finally { setSending(false); }
  };

  const totalUnread = chatRooms.reduce((a, r) => a + r.unread_count, 0);
  const isMine = (msg: Message) => msg.sender_id === parseInt(user?.id || "0");

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ── Nav ── */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/tenant/search" className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">R</span>
            </div>
            <span className="text-lg font-semibold text-gray-900">RoomBox</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/tenant/search" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">Search</Link>
            <Link href="/tenant/bookings" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">Bookings</Link>
            <div className="relative">
              <Link href="/tenant/messages" className="text-sm font-semibold text-blue-600">Messages</Link>
              {totalUnread > 0 && (
                <span className="absolute -top-1.5 -right-3 w-4 h-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center font-bold">{totalUnread}</span>
              )}
            </div>
            <span className="hidden sm:block text-sm text-gray-600">{user?.full_name || user?.email}</span>
          </div>
        </div>
      </nav>

      {/* ── Body ── */}
      <div className="flex-1 flex overflow-hidden" style={{ height: "calc(100vh - 57px)" }}>

        {/* ── Sidebar: chat list ── */}
        <div className={`w-full sm:w-80 lg:w-96 bg-white border-r border-gray-200 flex flex-col shrink-0 ${activeChatRoom ? "hidden sm:flex" : "flex"}`}>
          <div className="px-4 py-4 border-b border-gray-100">
            <h1 className="text-lg font-bold text-gray-900">Messages</h1>
            {totalUnread > 0 && <p className="text-xs text-gray-400 mt-0.5">{totalUnread} unread</p>}
          </div>

          <div className="flex-1 overflow-y-auto">
            {loadingRooms ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
              </div>
            ) : chatRooms.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mb-3">
                  <svg className="w-7 h-7 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <p className="text-gray-500 font-medium text-sm">No conversations yet</p>
                <p className="text-gray-400 text-xs mt-1">Contact a landlord from a room listing to start chatting.</p>
                <Link href="/tenant/search" className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                  Find Rooms
                </Link>
              </div>
            ) : chatRooms.map((room) => (
              <button
                key={room.id}
                onClick={() => openRoom(room)}
                className={`w-full px-4 py-4 flex items-start gap-3 text-left transition-colors border-b border-gray-50 hover:bg-gray-50 ${activeChatRoom?.id === room.id ? "bg-blue-50 border-l-2 border-l-blue-500" : ""}`}
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                    <span className="text-white font-bold text-sm">{room.landlord_name?.[0]?.toUpperCase() || "L"}</span>
                  </div>
                  {room.unread_count > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center font-bold leading-none">
                      {room.unread_count}
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline gap-2">
                    <p className={`text-sm truncate ${room.unread_count > 0 ? "font-bold text-gray-900" : "font-medium text-gray-800"}`}>
                      {room.landlord_name}
                    </p>
                    {room.last_message_time && (
                      <span className="text-xs text-gray-400 shrink-0">{timeAgo(room.last_message_time)}</span>
                    )}
                  </div>
                  {room.room_title && (
                    <p className="text-xs text-blue-500 truncate mb-0.5">{room.room_title}</p>
                  )}
                  <p className={`text-xs truncate ${room.unread_count > 0 ? "text-gray-700 font-medium" : "text-gray-400"}`}>
                    {room.last_message || "No messages yet"}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Main: chat pane ── */}
        <div className={`flex-1 flex flex-col ${activeChatRoom ? "flex" : "hidden sm:flex"}`}>
          {!activeChatRoom ? (
            /* Empty state */
            <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
              <div className="w-20 h-20 rounded-3xl bg-blue-50 flex items-center justify-center mb-4">
                <svg className="w-10 h-10 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-gray-500 font-medium">Select a conversation</p>
              <p className="text-gray-400 text-sm mt-1">Choose a landlord to start chatting</p>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3.5 flex items-center gap-3 shrink-0">
                {/* Back button (mobile) */}
                <button
                  onClick={() => { setActiveChatRoom(null); if (pollRef.current) clearInterval(pollRef.current); }}
                  className="sm:hidden w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shrink-0">
                  <span className="text-white font-bold">{activeChatRoom.landlord_name?.[0]?.toUpperCase() || "L"}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">{activeChatRoom.landlord_name}</p>
                  {activeChatRoom.room_title && (
                    <p className="text-xs text-gray-400 truncate">{activeChatRoom.room_title}</p>
                  )}
                </div>
                {activeChatRoom.room_id && (
                  <Link
                    href={`/tenant/room/${activeChatRoom.room_id}`}
                    className="shrink-0 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors"
                  >
                    View Room
                  </Link>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-3 bg-gray-50">
                {loadingMessages ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <p className="text-gray-400 text-sm">No messages yet. Say hello!</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const mine = isMine(msg);
                    return (
                      <div key={msg.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                        {!mine && (
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center mr-2 mt-auto shrink-0">
                            <span className="text-white text-xs font-bold">{msg.sender_name?.[0]?.toUpperCase()}</span>
                          </div>
                        )}
                        <div className={`max-w-[72%] flex flex-col gap-1 ${mine ? "items-end" : "items-start"}`}>
                          {!mine && <span className="text-xs text-gray-400 px-1">{msg.sender_name}</span>}
                          <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                            mine
                              ? "bg-blue-600 text-white rounded-tr-sm"
                              : "bg-white text-gray-800 border border-gray-200 shadow-sm rounded-tl-sm"
                          }`}>
                            <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                          </div>
                          <span className="text-xs text-gray-400 px-1">{timeAgo(msg.created_at)}</span>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <form onSubmit={handleSend} className="bg-white border-t border-gray-200 px-4 sm:px-6 py-3 shrink-0">
                <div className="flex gap-3 items-center">
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
