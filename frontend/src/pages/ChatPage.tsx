import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, ArrowLeft, MessageCircle, Search } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { connectSocket } from '@/lib/socket';
import api from '@/lib/api';
import type { User } from '@/types';

interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  isRead: boolean;
  createdAt: string;
  sender: { id: string; name: string; avatarUrl: string | null };
}

export default function ChatPage() {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const [selectedFriend, setSelectedFriend] = useState<User | null>(null);
  const [messageText, setMessageText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch friends list
  const { data: friends = [] } = useQuery<{ friend: User }[]>({
    queryKey: ['friends'],
    queryFn: () => api.get('/friends').then((r) => r.data.data),
  });

  // Fetch unread counts
  const { data: unreadCounts = {} } = useQuery<Record<string, number>>({
    queryKey: ['chat-unread'],
    queryFn: () => api.get('/chat/unread').then((r) => r.data.data),
    refetchInterval: 15000,
  });

  // Fetch messages when a friend is selected
  const { data: fetchedMessages, isLoading: messagesLoading } = useQuery<ChatMessage[]>({
    queryKey: ['chat-messages', selectedFriend?.id],
    queryFn: () => api.get(`/chat/${selectedFriend!.id}`).then((r) => r.data.data),
    enabled: !!selectedFriend,
  });

  useEffect(() => {
    if (fetchedMessages) {
      setMessages(fetchedMessages);
    }
  }, [fetchedMessages]);

  // Real-time socket listener
  useEffect(() => {
    const socket = connectSocket();

    const handleNewMessage = (msg: ChatMessage) => {
      // If message is part of the current conversation
      if (
        selectedFriend &&
        (msg.senderId === selectedFriend.id || msg.receiverId === selectedFriend.id)
      ) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }

      // Always refresh unread counts
      qc.invalidateQueries({ queryKey: ['chat-unread'] });
    };

    socket.on('chat:message', handleNewMessage);
    socket.on('chat:read', () => {
      qc.invalidateQueries({ queryKey: ['chat-unread'] });
    });

    return () => {
      socket.off('chat:message', handleNewMessage);
      socket.off('chat:read');
    };
  }, [selectedFriend, qc]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message
  const sendMutation = useMutation({
    mutationFn: (text: string) =>
      api.post(`/chat/${selectedFriend!.id}`, { text }).then((r) => r.data.data),
    onSuccess: () => {
      setMessageText('');
      inputRef.current?.focus();
    },
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !selectedFriend) return;
    sendMutation.mutate(messageText.trim());
  };

  const filteredFriends = friends.filter((f) =>
    f.friend.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalUnread = Object.values(unreadCounts).reduce((s, c) => s + c, 0);

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString())
      return 'Yesterday ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return (
      d.toLocaleDateString([], { month: 'short', day: 'numeric' }) +
      ' ' +
      d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    );
  };

  return (
    <div className="main-content" style={{ padding: 0, maxWidth: '100%', height: '100vh' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: selectedFriend ? '320px 1fr' : '1fr',
          height: '100%',
        }}
      >
        {/* Friends List Panel */}
        <div
          style={{
            background: 'var(--bg-secondary)',
            borderRight: '1px solid var(--border-light)',
            display: 'flex',
            flexDirection: 'column',
            height: '100vh',
            ...(selectedFriend ? {} : { maxWidth: 480, margin: '0 auto', width: '100%', borderRight: 'none' }),
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '1.5rem',
              borderBottom: '1px solid var(--border-light)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div>
                <p className="label" style={{ color: 'var(--accent-primary)', marginBottom: '0.25rem' }}>
                  Messages
                </p>
                <h2 style={{ fontSize: '1.35rem', margin: 0 }}>
                  Chat
                  {totalUnread > 0 && (
                    <span
                      style={{
                        background: 'var(--accent-primary)',
                        color: '#fff',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '0.15rem 0.5rem',
                        borderRadius: '9999px',
                        marginLeft: '0.75rem',
                        verticalAlign: 'middle',
                      }}
                    >
                      {totalUnread}
                    </span>
                  )}
                </h2>
              </div>
              <MessageCircle size={20} style={{ color: 'var(--text-muted)' }} />
            </div>

            {/* Search */}
            <div style={{ position: 'relative' }}>
              <Search
                size={14}
                style={{
                  position: 'absolute',
                  left: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                className="input"
                placeholder="Search friends..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '2.25rem', fontSize: '0.85rem' }}
              />
            </div>
          </div>

          {/* Friend List */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
            {filteredFriends.length === 0 && (
              <div
                style={{
                  textAlign: 'center',
                  padding: '3rem 1rem',
                  color: 'var(--text-muted)',
                  fontSize: '0.875rem',
                }}
              >
                <MessageCircle size={32} style={{ marginBottom: '0.75rem', opacity: 0.4 }} />
                <p>No friends yet</p>
                <p style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
                  Add friends to start chatting
                </p>
              </div>
            )}

            {filteredFriends.map(({ friend: f }) => {
              const unread = unreadCounts[f.id] || 0;
              const isActive = selectedFriend?.id === f.id;

              return (
                <button
                  key={f.id}
                  onClick={() => {
                    setSelectedFriend(f);
                    qc.invalidateQueries({ queryKey: ['chat-messages', f.id] });
                    qc.invalidateQueries({ queryKey: ['chat-unread'] });
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    width: '100%',
                    padding: '0.875rem 1rem',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    background: isActive ? 'var(--accent-subtle)' : 'transparent',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    textAlign: 'left',
                    marginBottom: '2px',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive)
                      (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-tertiary)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive)
                      (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      background: isActive
                        ? 'var(--accent-primary)'
                        : 'linear-gradient(135deg, var(--accent-hover), var(--bg-tertiary))',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.9rem',
                      fontWeight: 700,
                      color: isActive ? '#fff' : 'var(--accent-primary)',
                      flexShrink: 0,
                    }}
                  >
                    {f.name[0].toUpperCase()}
                  </div>

                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div
                      style={{
                        fontSize: '0.9rem',
                        fontWeight: unread > 0 ? 600 : 500,
                        color: 'var(--text-primary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {f.name}
                    </div>
                    <div
                      style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {f.email}
                    </div>
                  </div>

                  {unread > 0 && (
                    <div
                      style={{
                        background: 'var(--accent-primary)',
                        color: '#fff',
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        minWidth: 20,
                        height: 20,
                        borderRadius: '9999px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0 0.35rem',
                      }}
                    >
                      {unread}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Chat Panel */}
        {selectedFriend && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              height: '100vh',
              background: 'var(--bg-primary)',
            }}
          >
            {/* Chat Header */}
            <div
              style={{
                padding: '1rem 1.5rem',
                borderBottom: '1px solid var(--border-light)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                background: 'var(--bg-secondary)',
              }}
            >
              <button
                onClick={() => setSelectedFriend(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  padding: '0.25rem',
                  display: 'flex',
                  transition: 'color 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
              >
                <ArrowLeft size={18} />
              </button>

              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-hover))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  color: '#fff',
                  flexShrink: 0,
                }}
              >
                {selectedFriend.name[0].toUpperCase()}
              </div>

              <div>
                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {selectedFriend.name}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  {selectedFriend.email}
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
              }}
            >
              {messagesLoading && (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  <span className="spinner" style={{ display: 'inline-block' }} />
                </div>
              )}

              {!messagesLoading && messages.length === 0 && (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '4rem 1rem',
                    color: 'var(--text-muted)',
                    fontSize: '0.875rem',
                  }}
                >
                  <MessageCircle size={40} style={{ marginBottom: '1rem', opacity: 0.3 }} />
                  <p style={{ fontWeight: 500 }}>No messages yet</p>
                  <p style={{ fontSize: '0.75rem', marginTop: '0.35rem' }}>
                    Say hello to {selectedFriend.name}!
                  </p>
                </div>
              )}

              {messages.map((msg, i) => {
                const isMine = msg.senderId === user?.id;
                const showDate =
                  i === 0 ||
                  new Date(messages[i - 1].createdAt).toDateString() !==
                    new Date(msg.createdAt).toDateString();

                return (
                  <div key={msg.id}>
                    {showDate && (
                      <div
                        style={{
                          textAlign: 'center',
                          padding: '0.75rem 0',
                          fontSize: '0.7rem',
                          fontWeight: 500,
                          color: 'var(--text-muted)',
                          letterSpacing: '0.05em',
                          textTransform: 'uppercase',
                        }}
                      >
                        {new Date(msg.createdAt).toLocaleDateString([], {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </div>
                    )}

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: isMine ? 'flex-end' : 'flex-start',
                      }}
                    >
                      <div
                        style={{
                          maxWidth: '70%',
                          padding: '0.625rem 1rem',
                          borderRadius: isMine
                            ? '16px 16px 4px 16px'
                            : '16px 16px 16px 4px',
                          background: isMine
                            ? 'var(--accent-primary)'
                            : 'var(--bg-secondary)',
                          color: isMine ? '#fff' : 'var(--text-primary)',
                          border: isMine ? 'none' : '1px solid var(--border-light)',
                          fontSize: '0.875rem',
                          lineHeight: 1.5,
                          wordBreak: 'break-word',
                        }}
                      >
                        <div>{msg.text}</div>
                        <div
                          style={{
                            fontSize: '0.625rem',
                            marginTop: '0.25rem',
                            textAlign: 'right',
                            opacity: 0.7,
                            color: isMine ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)',
                          }}
                        >
                          {formatTime(msg.createdAt)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Message Input */}
            <form
              onSubmit={handleSend}
              style={{
                padding: '1rem 1.5rem',
                borderTop: '1px solid var(--border-light)',
                display: 'flex',
                gap: '0.75rem',
                background: 'var(--bg-secondary)',
              }}
            >
              <input
                ref={inputRef}
                className="input"
                placeholder={`Message ${selectedFriend.name}...`}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                autoFocus
                style={{ flex: 1, fontSize: '0.9rem' }}
              />
              <button
                type="submit"
                className="btn-gold"
                disabled={!messageText.trim() || sendMutation.isPending}
                style={{
                  padding: '0.625rem 1rem',
                  flexShrink: 0,
                }}
              >
                <Send size={16} />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
