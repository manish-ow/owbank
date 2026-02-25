'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useTheme } from '@/theme';

interface SuggestedAction {
    label: string;
    icon: string;
    message: string;
}

interface Message {
    role: 'user' | 'model';
    content: string;
    suggestedActions?: SuggestedAction[];
    actionType?: string;
    imageUrl?: string;
}

function renderMarkdown(text: string): string {
    return text
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/^- (.+)/gm, '<li>$1</li>')
        .replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul class="list-disc pl-4 space-y-1">$1</ul>')
        .replace(/\n/g, '<br/>');
}

interface OnboardingChatProps {
    onClose: () => void;
    onSuccess?: (email: string) => void;
}

export default function OnboardingChat({ onClose, onSuccess }: OnboardingChatProps) {
    const theme = useTheme();

    const [messages, setMessages] = useState<Message[]>([
        {
            role: 'model',
            content: `Welcome to ${theme.fullName}! 👋 I'm your AI onboarding assistant. I'll help you open a bank account in just a few minutes.\n\nTo get started, I'll need your ID. You can either:\n📷 **Upload a photo** of your ID card\n✍️ Or **provide your details manually** (full name, ID number, date of birth)`,
            suggestedActions: [
                { label: '📷 Upload ID', icon: '📷', message: 'I want to upload my ID card' },
                { label: '✍️ Enter Manually', icon: '✍️', message: 'I will provide my details manually' },
            ],
        },
    ]);

    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [attachedImage, setAttachedImage] = useState<{ dataUrl: string; base64: string; mimeType: string } | null>(null);
    const [isListening, setIsListening] = useState(false);
    const [speechSupported, setSpeechSupported] = useState(false);
    const [accountCreated, setAccountCreated] = useState<{ accountNumber: string; email: string } | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const recognitionRef = useRef<any>(null);
    const chatHistoryRef = useRef<{ role: 'user' | 'model'; parts: { text: string }[] }[]>([
        { role: 'model', parts: [{ text: `Welcome to ${theme.fullName}! I'm your AI onboarding assistant. Which country are you in?` }] },
    ]);

    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    useEffect(() => {
        const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SR) {
            setSpeechSupported(true);
            const rec = new SR();
            rec.continuous = false;
            rec.interimResults = false;
            rec.onresult = (e: any) => {
                const transcript = e.results[0][0].transcript;
                setInput(prev => prev ? `${prev} ${transcript}` : transcript);
                setIsListening(false);
            };
            rec.onerror = () => setIsListening(false);
            rec.onend = () => setIsListening(false);
            recognitionRef.current = rec;
        }
    }, []);

    const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = reader.result as string;
            setAttachedImage({ dataUrl, base64: dataUrl.split(',')[1], mimeType: file.type });
        };
        reader.readAsDataURL(file);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }, []);

    const toggleVoice = useCallback(() => {
        if (!recognitionRef.current) return;
        if (isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
        } else {
            recognitionRef.current.start();
            setIsListening(true);
        }
    }, [isListening]);

    const sendMessage = useCallback(async (text: string, img?: typeof attachedImage) => {
        if (!text.trim() && !img) return;
        setLoading(true);

        const currentImage = img || attachedImage;
        const userContent = text + (currentImage ? '\n📎 [ID card image attached]' : '');

        const userMessage: Message = {
            role: 'user',
            content: userContent,
            imageUrl: currentImage?.dataUrl,
        };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setAttachedImage(null);

        chatHistoryRef.current.push({ role: 'user', parts: [{ text }] });

        try {
            const body: any = { messages: chatHistoryRef.current };
            if (currentImage) {
                body.imageData = currentImage.base64;
                body.imageMimeType = currentImage.mimeType;
            }

            const res = await fetch('/api/ai/onboard', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            const data = await res.json();
            const aiText = data.response || 'Something went wrong. Please try again.';

            chatHistoryRef.current.push({ role: 'model', parts: [{ text: aiText }] });

            setMessages(prev => [...prev, {
                role: 'model',
                content: aiText,
                suggestedActions: data.suggestedActions || [],
                actionType: data.actionType,
            }]);

            if (data.actionType === 'account_created' && data.actionData) {
                setAccountCreated({
                    accountNumber: data.actionData.accountNumber,
                    email: data.actionData.email,
                });
            }
        } catch {
            setMessages(prev => [...prev, {
                role: 'model',
                content: 'Sorry, something went wrong. Please try again.',
            }]);
        } finally {
            setLoading(false);
        }
    }, [attachedImage]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        sendMessage(input);
    };

    const handleSuggestion = (msg: string) => sendMessage(msg);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
        >
            <div
                className="w-full max-w-lg rounded-2xl shadow-2xl flex flex-col overflow-hidden"
                style={{ height: '85vh', backgroundColor: '#ffffff' }}
            >
                {/* Header */}
                <div
                    className="flex items-center justify-between px-5 py-4"
                    style={{ backgroundColor: theme.primaryColor }}
                >
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-lg">🤖</div>
                        <div>
                            <p className="font-semibold text-sm" style={{ color: theme.textOnPrimary }}>AI Account Opening</p>
                            <p className="text-xs opacity-60" style={{ color: theme.textOnPrimary }}>Powered by Gemini 2.0</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                        style={{ color: theme.textOnPrimary }}
                    >
                        ✕
                    </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ backgroundColor: '#f8fafc' }}>
                    {messages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] ${msg.role === 'user' ? 'order-2' : ''}`}>
                                {/* AI avatar */}
                                {msg.role === 'model' && (
                                    <div className="flex items-center gap-2 mb-1">
                                        <div
                                            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                                            style={{ backgroundColor: theme.primaryColor, color: theme.textOnPrimary }}
                                        >
                                            AI
                                        </div>
                                        <span className="text-xs text-gray-400">{theme.assistantName}</span>
                                    </div>
                                )}

                                {/* Image preview in user message */}
                                {msg.imageUrl && (
                                    <div className="mb-2">
                                        <img src={msg.imageUrl} alt="ID card" className="rounded-xl max-h-36 max-w-full object-cover border border-gray-200" />
                                    </div>
                                )}

                                {/* Bubble */}
                                <div
                                    className="px-4 py-3 rounded-2xl text-sm leading-relaxed"
                                    style={
                                        msg.role === 'user'
                                            ? { backgroundColor: theme.primaryColor, color: theme.textOnPrimary }
                                            : { backgroundColor: '#ffffff', color: '#1f2937', border: '1px solid #e5e7eb' }
                                    }
                                    dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                                />

                                {/* Suggested action buttons */}
                                {msg.role === 'model' && msg.suggestedActions && msg.suggestedActions.length > 0 && i === messages.length - 1 && (
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {msg.suggestedActions.map((action, j) => (
                                            <button
                                                key={j}
                                                onClick={() => handleSuggestion(action.message)}
                                                disabled={loading || !!accountCreated}
                                                className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all hover:shadow-sm disabled:opacity-50"
                                                style={{
                                                    backgroundColor: `${theme.primaryColor}15`,
                                                    color: theme.primaryColor,
                                                    border: `1px solid ${theme.primaryColor}30`,
                                                }}
                                            >
                                                {action.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {loading && (
                        <div className="flex justify-start">
                            <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 flex gap-1.5">
                                {[0, 1, 2].map(i => (
                                    <div key={i} className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                                ))}
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Success banner */}
                {accountCreated && (
                    <div className="px-4 py-3 bg-green-50 border-t border-green-200 flex items-center justify-between gap-3">
                        <div className="flex-1">
                            <p className="text-xs font-semibold text-green-800">Account created! 🎉 Sign in with your email to access it.</p>
                        </div>
                        <button
                            onClick={() => { onClose(); onSuccess?.(accountCreated.email); }}
                            className="px-4 py-2 text-xs font-semibold rounded-xl text-white"
                            style={{ backgroundColor: theme.primaryColor }}
                        >
                            Sign In Now
                        </button>
                    </div>
                )}

                {/* Input */}
                {!accountCreated && (
                    <div className="px-4 py-3 border-t border-gray-100 bg-white">
                        {/* Image preview */}
                        {attachedImage && (
                            <div className="flex items-center gap-2 mb-2 p-2 bg-gray-50 rounded-xl">
                                <img src={attachedImage.dataUrl} alt="ID card" className="h-10 w-10 rounded-lg object-cover" />
                                <span className="text-xs text-gray-500 flex-1">ID card ready to send</span>
                                <button onClick={() => setAttachedImage(null)} className="text-gray-400 hover:text-red-500 text-lg leading-none">×</button>
                            </div>
                        )}
                        <form onSubmit={handleSubmit} className="flex items-center gap-2">
                            {/* Attachment */}
                            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                                title="Upload ID card"
                            >
                                📎
                            </button>

                            <input
                                className="flex-1 px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:border-transparent"
                                style={{ ['--tw-ring-color' as any]: `${theme.primaryColor}40` }}
                                placeholder="Type your reply..."
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                disabled={loading}
                            />

                            {/* Voice */}
                            {speechSupported && (
                                <button
                                    type="button"
                                    onClick={toggleVoice}
                                    className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                                    title={isListening ? 'Stop listening' : 'Voice input'}
                                >
                                    🎤
                                </button>
                            )}

                            {/* Send */}
                            <button
                                type="submit"
                                disabled={loading || (!input.trim() && !attachedImage)}
                                className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-white transition-all disabled:opacity-40"
                                style={{ backgroundColor: theme.primaryColor }}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}
