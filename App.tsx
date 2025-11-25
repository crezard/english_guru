import React, { useState, useRef, useEffect, useCallback } from 'react';
import { initializeChat, sendMessageStream } from './services/geminiService';
import { Message, Role } from './types';
import ChatMessage from './components/ChatMessage';
import { SendIcon, RefreshIcon, BotIcon } from './components/Icons';

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Initialize chat on mount
  useEffect(() => {
    initializeChat();
    // Add initial greeting
    setMessages([
      {
        id: 'init-1',
        role: Role.MODEL,
        text: "Hello! I'm your **AI English Teacher**. 👋\n\n영어로 문장을 입력해주시면 문법을 교정해드리고 영어로 대화도 나눠요! \nLet's start practicing! 🇺🇸🇬🇧",
        timestamp: new Date(),
      },
    ]);
  }, []);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Auto-resize textarea
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [inputValue]);

  const handleReset = () => {
    if (window.confirm("Start a new conversation? (대화를 초기화하시겠습니까?)")) {
      initializeChat();
      setMessages([
        {
          id: Date.now().toString(),
          role: Role.MODEL,
          text: "Conversation reset. What would you like to talk about? ✨",
          timestamp: new Date(),
        },
      ]);
      setInputValue('');
    }
  };

  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim() || isLoading) return;

    const userText = inputValue.trim();
    setInputValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: Role.USER,
      text: userText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Placeholder for AI message
      const aiMessageId = (Date.now() + 1).toString();
      setMessages((prev) => [
        ...prev,
        {
          id: aiMessageId,
          role: Role.MODEL,
          text: '',
          timestamp: new Date(),
        },
      ]);

      let accumulatedText = '';

      await sendMessageStream(userText, (chunk) => {
        accumulatedText += chunk;
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === aiMessageId ? { ...msg, text: accumulatedText } : msg
          )
        );
      });
    } catch (error) {
      console.error("Failed to send message", error);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: Role.MODEL,
          text: "Sorry, I encountered an error. Please try again later. 😥",
          isError: true,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [inputValue, isLoading]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 relative overflow-hidden">
      {/* Header */}
      <header className="flex-none bg-white border-b border-slate-200 shadow-sm z-10">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
              <BotIcon className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold text-slate-800">
              English <span className="text-indigo-600">Guru</span>
            </h1>
          </div>
          <button
            onClick={handleReset}
            className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
            title="Reset Conversation"
          >
            <RefreshIcon className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto px-4 py-6 scroll-smooth">
        <div className="max-w-3xl mx-auto flex flex-col min-h-full">
          {messages.length === 0 && (
            <div className="flex-1 flex items-center justify-center text-slate-400">
              <p>Say hello to start practicing English!</p>
            </div>
          )}
          
          {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))}
          
          {isLoading && messages[messages.length - 1]?.role !== Role.MODEL && (
            <div className="flex justify-start mb-6 w-full animate-pulse">
               <div className="flex items-start gap-3">
                 <div className="h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center">
                    <div className="h-2 w-2 bg-indigo-400 rounded-full animate-bounce delay-75"></div>
                    <div className="h-2 w-2 bg-indigo-400 rounded-full animate-bounce mx-1 delay-150"></div>
                    <div className="h-2 w-2 bg-indigo-400 rounded-full animate-bounce delay-300"></div>
                 </div>
               </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input Area */}
      <footer className="flex-none bg-white border-t border-slate-200 px-4 py-4">
        <div className="max-w-3xl mx-auto relative">
          <div className="relative flex items-end gap-2 bg-slate-100 p-2 rounded-2xl border border-transparent focus-within:border-indigo-300 focus-within:bg-white focus-within:shadow-md transition-all duration-200">
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Write in English... (e.g., I go to school yesterday)"
              className="w-full bg-transparent border-none focus:ring-0 resize-none py-3 px-3 text-slate-800 placeholder:text-slate-400 max-h-[120px] scrollbar-hide"
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading}
              className={`flex-shrink-0 p-3 rounded-xl mb-0.5 transition-all duration-200 ${
                inputValue.trim() && !isLoading
                  ? 'bg-indigo-600 text-white shadow-md hover:bg-indigo-700 transform hover:scale-105'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <SendIcon className="w-5 h-5" />
            </button>
          </div>
          <p className="text-center text-xs text-slate-400 mt-2">
            AI can make mistakes. Please double check important information.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;