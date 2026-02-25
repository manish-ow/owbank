'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from '@/i18n';
import { useTheme } from '@/theme';

interface SuggestedAction {
  label: string;
  icon: string;
  message: string;
}

interface Message {
  role: 'user' | 'model';
  content: string;
  agent?: string;
  suggestedActions?: SuggestedAction[];
  actionType?: string;
  imageUrl?: string; // base64 data URL for displaying attached images
}

function renderMarkdown(text: string): string {
  let html = text
    // Bold
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    // Lists
    .replace(/^- (.+)/gm, '<li>$1</li>')
    // Wrap consecutive <li> in <ul>
    .replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul class="list-disc pl-4 space-y-1">$1</ul>')
    // Line breaks
    .replace(/\n/g, '<br/>');
  return html;
}

function getAgentColor(agent: string) {
  switch (agent) {
    case 'Manager': return { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A' };
    case 'Transaction': return { bg: '#D1FAE5', text: '#065F46', border: '#A7F3D0' };
    case 'Card': return { bg: '#EDE9FE', text: '#5B21B6', border: '#DDD6FE' };
    case 'Loan': return { bg: '#FEE2E2', text: '#991B1B', border: '#FECACA' };
    default: return { bg: '#F3F4F6', text: '#374151', border: '#E5E7EB' };
  }
}

function getAgentIcon(agent: string) {
  switch (agent) {
    case 'Manager': return '\u{1F464}';
    case 'Transaction': return '\u2197\uFE0F';
    case 'Card': return '\u{1F4B3}';
    case 'Loan': return '\u{1F3E6}';
    default: return '\u{1F916}';
  }
}

export default function AIChat() {
  const { t } = useTranslation();
  const theme = useTheme();

  const defaultActions: SuggestedAction[] = useMemo(() => [
    { label: t('aiChat', 'checkBalance'), icon: '\u{1F4B0}', message: t('aiChat', 'showBalance') },
    { label: t('aiChat', 'transactions'), icon: '\u{1F4CB}', message: t('aiChat', 'showTransactions') },
    { label: t('aiChat', 'applyForCard'), icon: '\u{1F4B3}', message: t('aiChat', 'applyForCardMsg') },
    { label: t('aiChat', 'applyForLoan'), icon: '\u{1F3E6}', message: t('aiChat', 'applyForLoanMsg') },
    { label: t('aiChat', 'transferMoney'), icon: '\u2197\uFE0F', message: t('aiChat', 'transferMoneyMsg') },
  ], [t]);

  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'model',
      content: t('aiChat', 'welcomeMessage'),
      agent: 'Manager',
      suggestedActions: [
        { label: t('aiChat', 'checkBalance'), icon: '\u{1F4B0}', message: t('aiChat', 'showBalance') },
        { label: t('aiChat', 'transactions'), icon: '\u{1F4CB}', message: t('aiChat', 'showTransactions') },
        { label: t('aiChat', 'applyForCard'), icon: '\u{1F4B3}', message: t('aiChat', 'applyForCardMsg') },
        { label: t('aiChat', 'applyForLoan'), icon: '\u{1F3E6}', message: t('aiChat', 'applyForLoanMsg') },
        { label: t('aiChat', 'transferMoney'), icon: '\u2197\uFE0F', message: t('aiChat', 'transferMoneyMsg') },
      ],
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Image upload state
  const [attachedImage, setAttachedImage] = useState<{ dataUrl: string; base64: string; mimeType: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Voice input state
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Check for speech recognition support
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const currentActions = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'model' && messages[i].suggestedActions?.length) {
        return messages[i].suggestedActions!;
      }
    }
    return defaultActions;
  }, [messages, defaultActions]);

  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      // Extract base64 data (remove data:image/...;base64, prefix)
      const base64 = dataUrl.split(',')[1];
      setAttachedImage({ dataUrl, base64, mimeType: file.type });
    };
    reader.readAsDataURL(file);

    // Reset file input so re-selecting the same file works
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const removeAttachedImage = useCallback(() => {
    setAttachedImage(null);
  }, []);

  const toggleVoice = useCallback(() => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch {
        setIsListening(false);
      }
    }
  }, [isListening]);

  const sendMessage = async (text: string) => {
    if ((!text.trim() && !attachedImage) || loading) return;

    const userMessage: Message = {
      role: 'user',
      content: text || (attachedImage ? t('aiChat', 'imageAttached') : ''),
      imageUrl: attachedImage?.dataUrl,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    // Capture image data before clearing
    const currentImage = attachedImage;
    setAttachedImage(null);

    try {
      const chatHistory = [...messages, { role: userMessage.role, content: userMessage.content }].map((m) => ({
        role: m.role,
        parts: [{ text: m.content }],
      }));

      const body: any = { messages: chatHistory };
      if (currentImage) {
        body.imageData = currentImage.base64;
        body.imageMimeType = currentImage.mimeType;
      }

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (data.error) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'model',
            content: `${t('aiChat', 'errorPrefix')} ${data.error}`,
            agent: 'Manager',
            suggestedActions: defaultActions,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: 'model',
            content: data.response,
            agent: data.agent || 'Manager',
            suggestedActions: data.suggestedActions || defaultActions,
            actionType: data.actionType,
          },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'model',
          content: t('aiChat', 'genericError'),
          agent: 'Manager',
          suggestedActions: defaultActions,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: `linear-gradient(to bottom right, ${theme.primaryColor}, ${theme.accentColor})` }}
          >
            <svg className="w-5 h-5" style={{ color: theme.textOnPrimary }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 text-sm">{theme.assistantName}</h3>
            <p className="text-xs text-gray-400">{t('aiChat', 'poweredBy')}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-gray-400">{t('common', 'online')}</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4" style={{ backgroundColor: '#f8fafc' }}>
        {messages.map((msg, i) => (
          <div key={i}>
            <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} items-end gap-2`}>
              {msg.role === 'model' && (
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `linear-gradient(to bottom right, ${theme.primaryColor}, ${theme.accentColor})` }}
                >
                  <svg className="w-3.5 h-3.5" style={{ color: theme.textOnPrimary }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              )}
              <div className={`max-w-[75%] ${msg.role === 'user' ? '' : ''}`}>
                {msg.agent && msg.role === 'model' && (
                  <div className="mb-1 flex items-center gap-1.5">
                    <span className="text-xs" style={{ color: getAgentColor(msg.agent).text }}>
                      {getAgentIcon(msg.agent)}
                    </span>
                    <span
                      className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded"
                      style={{
                        backgroundColor: getAgentColor(msg.agent).bg,
                        color: getAgentColor(msg.agent).text,
                      }}
                    >
                      {msg.agent} {t('aiChat', 'agent')}
                    </span>
                  </div>
                )}
                <div
                  className={`rounded-2xl px-4 py-3 ${msg.role === 'user'
                    ? 'rounded-br-md'
                    : 'bg-white border border-gray-200 text-gray-700 rounded-bl-md shadow-sm'
                    }`}
                  style={
                    msg.role === 'user'
                      ? { backgroundColor: theme.primaryColor, color: theme.textOnPrimary }
                      : undefined
                  }
                >
                  {/* Show attached image in user message */}
                  {msg.imageUrl && (
                    <div className="mb-2">
                      <img
                        src={msg.imageUrl}
                        alt="Attached"
                        className="rounded-lg max-h-40 max-w-full object-cover"
                      />
                    </div>
                  )}
                  <div
                    className="text-sm leading-relaxed [&_strong]:font-semibold [&_ul]:mt-1 [&_ul]:mb-1 [&_li]:text-sm"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                  />
                </div>
              </div>
              {msg.role === 'user' && (
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: theme.primaryColor }}
                >
                  <svg className="w-3.5 h-3.5" style={{ color: theme.textOnPrimary }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start items-end gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: `linear-gradient(to bottom right, ${theme.primaryColor}, ${theme.accentColor})` }}
            >
              <svg className="w-3.5 h-3.5" style={{ color: theme.textOnPrimary }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-cyan rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-cyan rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-cyan rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-xs text-gray-400 ml-1">{t('common', 'processing')}</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Dynamic Quick Actions */}
      <div className="px-4 sm:px-6 py-2 bg-white border-t border-gray-100">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {currentActions.map((action, idx) => (
            <button
              key={`${action.label}-${idx}`}
              onClick={() => sendMessage(action.message)}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-full text-xs font-medium text-gray-600 hover:bg-navy hover:text-white hover:border-navy transition-all disabled:opacity-50 whitespace-nowrap flex-shrink-0"
            >
              <span>{action.icon}</span>
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Image Preview */}
      {attachedImage && (
        <div className="px-4 sm:px-6 py-2 bg-white border-t border-gray-100">
          <div className="inline-flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
            <img
              src={attachedImage.dataUrl}
              alt="Preview"
              className="w-12 h-12 rounded-lg object-cover"
            />
            <span className="text-xs text-gray-500">{t('aiChat', 'imageAttached')}</span>
            <button
              onClick={removeAttachedImage}
              className="w-5 h-5 rounded-full bg-gray-200 hover:bg-red-100 flex items-center justify-center transition-colors"
              title={t('aiChat', 'removeImage')}
            >
              <svg className="w-3 h-3 text-gray-500 hover:text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-4 sm:px-6 py-3 bg-white border-t border-gray-200">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(input);
          }}
          className="flex items-center gap-2"
        >
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />

          {/* Attach image button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-all border border-gray-200 bg-gray-50 hover:bg-gray-100 disabled:opacity-30"
            title={t('aiChat', 'attachImage')}
          >
            <svg className="w-4.5 h-4.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>

          {/* Voice input button */}
          {speechSupported && (
            <button
              type="button"
              onClick={toggleVoice}
              disabled={loading}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all border disabled:opacity-30 ${isListening
                  ? 'bg-red-50 border-red-300 animate-pulse'
                  : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                }`}
              title={isListening ? t('aiChat', 'listening') : t('aiChat', 'voiceInput')}
            >
              <svg
                className={`w-4.5 h-4.5 ${isListening ? 'text-red-500' : 'text-gray-500'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </button>
          )}

          <div className="flex-1 relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isListening ? t('aiChat', 'listening') : t('aiChat', 'inputPlaceholder')}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-cyan focus:bg-white text-sm transition-all pr-10"
              disabled={loading}
            />
          </div>
          <button
            type="submit"
            disabled={loading || (!input.trim() && !attachedImage)}
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-all disabled:opacity-30 hover:shadow-lg"
            style={{ backgroundColor: theme.primaryColor, color: theme.textOnPrimary }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 12h14m-7-7l7 7-7 7" />
            </svg>
          </button>
        </form>
        <div className="flex items-center justify-center gap-1.5 mt-2">
          <svg className="w-3 h-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span className="text-[10px] text-gray-300 tracking-wide">{t('aiChat', 'geminiFlash')}</span>
        </div>
      </div>
    </div>
  );
}
