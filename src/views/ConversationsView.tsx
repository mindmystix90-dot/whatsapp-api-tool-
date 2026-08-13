import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Conversation, Message, Lead, LeadStatus, ConversationMode } from '../types';
import {
  MessageSquare,
  Search,
  Bot,
  UserCheck,
  Send,
  Phone,
  Clock,
  Sparkles,
  AlertCircle,
  CheckCheck,
  User,
  Filter
} from 'lucide-react';

export const ConversationsView: React.FC = () => {
  const { fetchWithAuth } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterMode, setFilterMode] = useState<'ALL' | 'AI' | 'HUMAN'>('ALL');

  const [inputMessage, setInputMessage] = useState<string>('');
  const [sending, setSending] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [loadingList, setLoadingList] = useState<boolean>(true);
  const [loadingChat, setLoadingChat] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadConversations = async (keepActiveId?: string) => {
    try {
      const res = await fetchWithAuth('/api/conversations');
      if (res.ok) {
        const data = await res.json();
        const list: Conversation[] = data.conversations || [];
        setConversations(list);

        if (list.length > 0) {
          const targetId = keepActiveId || activeConvId || list[0].id;
          if (list.some((c) => c.id === targetId)) {
            setActiveConvId(targetId);
          } else {
            setActiveConvId(list[0].id);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setLoadingList(false);
    }
  };

  const loadActiveConversationDetails = async (convId: string) => {
    setLoadingChat(true);
    setErrorMsg(null);
    try {
      const res = await fetchWithAuth(`/api/conversations/${convId}`);
      if (res.ok) {
        const data = await res.json();
        setActiveConv(data.conversation);
        setMessages(data.messages || []);
        setActiveLead(data.lead || null);
      }
    } catch (err) {
      console.error('Failed to load conversation details:', err);
    } finally {
      setLoadingChat(false);
    }
  };

  useEffect(() => {
    loadConversations();
    const interval = setInterval(() => {
      loadConversations(activeConvId || undefined);
      if (activeConvId) {
        loadActiveConversationDetails(activeConvId);
      }
    }, 5000); // Polling every 5s for live updates
    return () => clearInterval(interval);
  }, [activeConvId]);

  useEffect(() => {
    if (activeConvId) {
      loadActiveConversationDetails(activeConvId);
    }
  }, [activeConvId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleToggleMode = async (newMode: ConversationMode) => {
    if (!activeConvId) return;
    try {
      const res = await fetchWithAuth(`/api/conversations/${activeConvId}/mode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: newMode })
      });
      if (res.ok) {
        const data = await res.json();
        setActiveConv(data.conversation);
        loadConversations(activeConvId);
      }
    } catch (err) {
      console.error('Failed to toggle mode:', err);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !activeConvId || sending) return;

    setSending(true);
    setErrorMsg(null);
    const text = inputMessage.trim();
    setInputMessage('');

    try {
      const res = await fetchWithAuth(`/api/conversations/${activeConvId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: text })
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to send message');
        setInputMessage(text); // restore typed text
      } else {
        setMessages((prev) => [...prev, data.message]);
        loadConversations(activeConvId);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to send message');
      setInputMessage(text);
    } finally {
      setSending(false);
    }
  };

  const handleUpdateLeadStatus = async (status: LeadStatus) => {
    if (!activeLead) return;
    try {
      const res = await fetchWithAuth(`/api/leads/${activeLead.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        const data = await res.json();
        setActiveLead(data.lead);
      }
    } catch (err) {
      console.error('Failed to update lead status:', err);
    }
  };

  const filteredConversations = conversations.filter((c) => {
    const custName = c.customer?.name || '';
    const custPhone = c.customer?.phone_number || '';
    const matchSearch =
      custName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      custPhone.includes(searchQuery);

    if (filterMode === 'AI') return matchSearch && c.mode === 'AI';
    if (filterMode === 'HUMAN') return matchSearch && c.mode === 'HUMAN';
    return matchSearch;
  });

  return (
    <div className="h-[calc(100vh-4rem)] flex overflow-hidden bg-slate-50">
      {/* LEFT PANE: Conversation List */}
      <div className="w-80 md:w-96 bg-white border-r border-slate-200 flex flex-col shrink-0">
        {/* Search & Filter Header */}
        <div className="p-4 border-b border-slate-100 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by name or number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-100/80 border border-transparent focus:border-cyan-500 focus:bg-white rounded-xl text-xs text-slate-800 outline-none transition-all"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-medium text-slate-600">
            <button
              onClick={() => setFilterMode('ALL')}
              className={`flex-1 py-1 rounded-lg transition-all text-center ${
                filterMode === 'ALL' ? 'bg-white text-slate-900 font-semibold shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterMode('AI')}
              className={`flex-1 py-1 rounded-lg transition-all text-center flex items-center justify-center gap-1 ${
                filterMode === 'AI' ? 'bg-white text-cyan-600 font-semibold shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              <Bot className="w-3 h-3" />
              <span>AI Mode</span>
            </button>
            <button
              onClick={() => setFilterMode('HUMAN')}
              className={`flex-1 py-1 rounded-lg transition-all text-center flex items-center justify-center gap-1 ${
                filterMode === 'HUMAN' ? 'bg-white text-indigo-600 font-semibold shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              <UserCheck className="w-3 h-3" />
              <span>Human</span>
            </button>
          </div>
        </div>

        {/* List Items */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {loadingList && conversations.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">Loading inbox...</div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs font-semibold text-slate-600">No conversations yet.</p>
              <p className="text-[11px] text-slate-400 leading-relaxed max-w-xs mx-auto">
                When customers message your connected WhatsApp Business number, chats will appear here instantly.
              </p>
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isSelected = conv.id === activeConvId;
              const customerName = conv.customer?.name || 'Customer';
              const phone = conv.customer?.phone_number || '';
              const dateStr = conv.last_message_at
                ? new Date(conv.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '';

              return (
                <div
                  key={conv.id}
                  onClick={() => setActiveConvId(conv.id)}
                  className={`p-4 cursor-pointer transition-all flex items-start gap-3 relative ${
                    isSelected ? 'bg-cyan-50/60 border-l-4 border-cyan-500' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-sm shrink-0 uppercase">
                    {customerName.charAt(0)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-800 truncate">{customerName}</h4>
                      <span className="text-[10px] text-slate-400 shrink-0">{dateStr}</span>
                    </div>

                    <p className="text-[11px] text-slate-500 truncate mt-0.5">{conv.last_message}</p>

                    <div className="flex items-center gap-2 mt-2">
                      {conv.mode === 'AI' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-cyan-50 text-cyan-600 border border-cyan-200/60 px-1.5 py-0.5 rounded-md">
                          <Bot className="w-2.5 h-2.5" />
                          <span>AI Active</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-indigo-50 text-indigo-600 border border-indigo-200/60 px-1.5 py-0.5 rounded-md">
                          <UserCheck className="w-2.5 h-2.5" />
                          <span>Human Mode</span>
                        </span>
                      )}

                      <span className="text-[10px] text-slate-400 truncate">{phone}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT PANE: Chat Window & Customer Info Panel */}
      {activeConvId && activeConv ? (
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Main Chat Conversation Window */}
          <div className="flex-1 flex flex-col bg-slate-100/50">
            {/* Chat Header */}
            <div className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 text-white font-bold flex items-center justify-center text-xs uppercase shadow-xs">
                  {(activeConv.customer?.name || 'C').charAt(0)}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 leading-none">
                    {activeConv.customer?.name || 'WhatsApp Customer'}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-slate-400" />
                    <span>{activeConv.customer?.phone_number}</span>
                  </p>
                </div>
              </div>

              {/* Mode Control Toggle Buttons */}
              <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => handleToggleMode('AI')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    activeConv.mode === 'AI'
                      ? 'bg-cyan-500 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Bot className="w-3.5 h-3.5" />
                  <span>Return to AI</span>
                </button>
                <button
                  onClick={() => handleToggleMode('HUMAN')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    activeConv.mode === 'HUMAN'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Take Over (Human)</span>
                </button>
              </div>
            </div>

            {/* Error Banner if message sending fails */}
            {errorMsg && (
              <div className="bg-rose-50 border-b border-rose-200 p-3 text-xs text-rose-700 flex items-center gap-2 px-6 shrink-0">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span className="flex-1">{errorMsg}</span>
              </div>
            )}

            {/* Messages Stream */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {loadingChat ? (
                <div className="text-center text-xs text-slate-400 py-10">Loading messages...</div>
              ) : messages.length === 0 ? (
                <div className="text-center text-xs text-slate-400 py-10">No message history available.</div>
              ) : (
                messages.map((m) => {
                  const isCustomer = m.sender_type === 'customer';
                  const isAI = m.sender_type === 'ai';
                  const timeStr = new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isCustomer ? 'items-start' : 'items-end'}`}
                    >
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1 px-1">
                        {isCustomer ? (
                          <span className="font-semibold text-slate-600">{activeConv.customer?.name}</span>
                        ) : isAI ? (
                          <span className="font-semibold text-cyan-600 flex items-center gap-1">
                            <Bot className="w-3 h-3" /> Fishcatch AI Agent
                          </span>
                        ) : (
                          <span className="font-semibold text-indigo-600 flex items-center gap-1">
                            <User className="w-3 h-3" /> You (Human Agent)
                          </span>
                        )}
                        <span>•</span>
                        <span>{timeStr}</span>
                      </div>

                      <div
                        className={`max-w-md px-4 py-2.5 rounded-2xl text-xs leading-relaxed shadow-2xs whitespace-pre-wrap ${
                          isCustomer
                            ? 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-xs'
                            : isAI
                            ? 'bg-slate-900 text-slate-100 rounded-tr-xs border border-slate-800'
                            : 'bg-indigo-600 text-white rounded-tr-xs'
                        }`}
                      >
                        {m.body}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Manual Message Input Box */}
            <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-slate-200 flex items-center gap-3">
              <input
                type="text"
                placeholder={
                  activeConv.mode === 'AI'
                    ? 'Type a message (Note: Sending manually will switch mode to Human)...'
                    : 'Type a message to send directly via Meta WhatsApp API...'
                }
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                className="flex-1 bg-slate-100/80 border border-slate-200 focus:bg-white focus:border-cyan-500 rounded-xl px-4 py-2.5 text-xs text-slate-800 outline-none transition-all"
              />
              <button
                type="submit"
                disabled={sending || !inputMessage.trim()}
                className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-40 text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-2 shadow-sm"
              >
                <span>{sending ? 'Sending...' : 'Send'}</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>

          {/* Customer & Lead Details Side Drawer */}
          <div className="w-full md:w-72 bg-white border-l border-slate-200 p-6 flex flex-col justify-between shrink-0 space-y-6">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
                Lead Intelligence
              </h4>

              <div className="space-y-4">
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 block">Customer Name</label>
                  <p className="text-sm font-bold text-slate-800 mt-0.5">{activeConv.customer?.name}</p>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-500 block">WhatsApp Number</label>
                  <p className="text-xs font-mono text-slate-700 mt-0.5">{activeConv.customer?.phone_number}</p>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                    Lead Status
                  </label>
                  <select
                    value={activeLead?.status || 'NEW'}
                    onChange={(e) => handleUpdateLeadStatus(e.target.value as LeadStatus)}
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-cyan-500"
                  >
                    <option value="NEW">🟢 NEW</option>
                    <option value="CONTACTED">🔵 CONTACTED</option>
                    <option value="QUALIFIED">🟣 QUALIFIED</option>
                    <option value="CONVERTED">⭐ CONVERTED</option>
                    <option value="LOST">🔴 LOST</option>
                  </select>
                </div>

                <div className="pt-3 border-t border-slate-100">
                  <label className="text-[11px] font-semibold text-slate-500 block">Lead Source</label>
                  <p className="text-xs text-slate-600 mt-0.5">{activeLead?.source || 'WhatsApp Direct'}</p>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-500 block">First Contact</label>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {activeLead?.created_at ? new Date(activeLead.created_at).toLocaleString() : 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-cyan-50 border border-cyan-100 rounded-2xl p-4 text-xs text-cyan-900 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-cyan-600" />
                <span>AI Handoff Rule</span>
              </p>
              <p className="text-[11px] text-cyan-800/80 leading-relaxed">
                When set to AI Mode, Gemini automatically handles questions. Toggle to Human to pause AI auto-replies.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50">
          <MessageSquare className="w-12 h-12 text-slate-300 mb-3" />
          <h3 className="text-sm font-bold text-slate-700">Select a Conversation</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            Choose a customer chat from the list on the left to view messages and manage AI handoff.
          </p>
        </div>
      )}
    </div>
  );
};
