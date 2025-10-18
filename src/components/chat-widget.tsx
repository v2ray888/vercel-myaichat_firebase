"use client"

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { MessageCircle, X, Send, Bot, User, Paperclip, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Separator } from './ui/separator';
import { Input } from './ui/input';
import Image from 'next/image';
import Pusher from 'pusher-js';

type Message = {
  id: string;
  text: string;
  sender: 'user' | 'bot' | 'agent' | 'system';
  timestamp: string;
};

type WidgetSettings = {
    id: string;
    welcomeMessage: string;
    autoOpenWidget: boolean;
    brandLogoUrl: string | null;
    primaryColor: string;
    backgroundColor: string;
    workspaceName: string;
};

// Skeleton component for the initial loading state
const WidgetSkeleton = () => (
    <Button 
        className="fixed bottom-4 right-4 h-16 w-16 rounded-full shadow-lg z-50 animate-pulse bg-muted"
        aria-label="正在加载聊天窗口"
        disabled
    >
        <MessageCircle className="h-8 w-8 text-muted-foreground" />
    </Button>
);


function ChatWidgetContent() {
    const [settings, setSettings] = useState<WidgetSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [appId, setAppId] = useState<string | null>(null);
    const [isOpen, setIsOpen] = useState(false); 
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [isConnecting, setIsConnecting] = useState(false);
    
    const searchParams = useSearchParams();

    useEffect(() => {
        const fetchSettingsAndAppId = async () => {
            setIsLoading(true);
            let foundAppId: string | null = null;
            
            // Priority 1: Get appId from URL (for iframe embedding)
            foundAppId = searchParams.get('appId');

            // Priority 2: Get appId from window object (for script injection)
            if (!foundAppId && typeof window !== 'undefined' && (window as any).zhiliaotongSettings) {
                foundAppId = (window as any).zhiliaotongSettings.appId;
            }

            // Priority 3: If no appId yet, fetch default settings from API (for guest users on main site)
            if (!foundAppId) {
                 try {
                    const res = await fetch('/api/settings');
                    if (res.ok) {
                        const data = await res.json();
                        foundAppId = data.id;
                    }
                } catch (error) {
                    console.error("Default settings fetch failed:", error);
                }
            }
            
            if (foundAppId) {
                setAppId(foundAppId);
                try {
                    const res = await fetch(`/api/settings?appId=${foundAppId}`);
                    if (res.ok) {
                        const data = await res.json();
                        setSettings(data);
                        setMessages([{ id: 'initial-message', text: data.welcomeMessage || '您好！有什么可以帮助您的吗？', sender: 'bot', timestamp: new Date().toISOString() }]);
                        if (data.autoOpenWidget && !sessionStorage.getItem('chat-widget-opened')) {
                            setIsOpen(true);
                            sessionStorage.setItem('chat-widget-opened', 'true');
                        }
                    } else {
                        console.error("Failed to fetch widget settings:", await res.text());
                    }
                } catch (error) {
                    console.error("Error fetching widget settings:", error);
                }
            }
            
            setIsLoading(false);
        };

        fetchSettingsAndAppId();
    }, [searchParams]);


    let pusherClient: Pusher | null = null;
    const getPusherClient = () => {
        if (!pusherClient) {
            if (typeof window !== "undefined") {
                pusherClient = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
                    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
                    authEndpoint: '/api/pusher-auth',
                });
            }
        }
        return pusherClient;
    }


    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const subscribeToChannel = (convId: string) => {
        const pusher = getPusherClient();
        if (!pusher) return;
        
        const channelName = `private-conversation-${convId}`;
        
        pusher.unsubscribe(channelName);
        
        const channel = pusher.subscribe(channelName);
        setIsConnecting(true);

        channel.bind('pusher:subscription_succeeded', () => {
            setIsConnecting(false);
            console.log("Customer stream connected to", channelName);
        });
        
        channel.bind('pusher:subscription_error', (status: any) => {
            console.error("Pusher subscription failed:", status);
            setIsConnecting(false);
            setMessages(prev => [...prev, { id: 'error-msg', text: `连接失败，请重试`, sender: 'system', timestamp: new Date().toISOString() }]);
        });

        channel.bind('new-message', (msgData: any) => {
            const msg = typeof msgData === 'string' ? JSON.parse(msgData) : msgData;
            if (msg.sender === 'agent') {
                setMessages((prev) => [...prev, msg]);
            }
        });
    }
    
    useEffect(() => {
        const storedConvId = sessionStorage.getItem('chat-conversation-id');
        if (isOpen && !conversationId && storedConvId && settings) {
             setConversationId(storedConvId);
             subscribeToChannel(storedConvId);
            
            fetch(`/api/stream-chat?conversationId=${storedConvId}`).then(res => res.json()).then(data => {
                if (data && data.messages && data.messages.length > 0) {
                     const historyMessages = data.messages.map((msg: any) => ({...msg, sender: msg.sender === 'customer' ? 'user' : (msg.sender || 'agent')}));
                     setMessages(prev => [prev[0], ...historyMessages]);
                }
            }).catch(err => console.error("Failed to fetch history:", err));
        }
        
        const handleUnload = () => {
             const pusher = getPusherClient();
             if (pusher && conversationId) {
                pusher.unsubscribe(`private-conversation-${conversationId}`);
             }
        };

        window.addEventListener('beforeunload', handleUnload);
        
        return () => {
            window.removeEventListener('beforeunload', handleUnload);
        };
    }, [isOpen, conversationId, settings]); 

    useEffect(() => {
        if (isOpen) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isOpen]);

    const handleSendMessage = async () => {
        if (!inputValue.trim() || !settings) return;

        const userMessage: Message = {
            id: crypto.randomUUID(),
            text: inputValue,
            sender: 'user',
            timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, userMessage]);
        const currentInputValue = inputValue;
        setInputValue('');
        
        try {
            const response = await fetch('/api/stream-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                  message: currentInputValue, 
                  conversationId: conversationId,
                  role: 'customer',
                  senderName: `访客`,
                  appId: settings.id,
                }),
            });
            if (!response.ok) throw new Error('发送失败');

            const { newConversationId } = await response.json();
            
            if (!conversationId && newConversationId) {
                setConversationId(newConversationId);
                sessionStorage.setItem('chat-conversation-id', newConversationId);
                subscribeToChannel(newConversationId);
            }

        } catch (error: any) {
             setMessages((prev) => [...prev, {
                id: crypto.randomUUID(),
                text: `发送失败: ${error.message}`,
                sender: 'system',
                timestamp: new Date().toISOString()
            }]);
        }
    };
    
    // While loading settings, show skeleton
    if (isLoading) {
        return <WidgetSkeleton />;
    }

    // If no settings/appId could be loaded, render nothing
    if (!settings || !appId) {
        return null;
    }
    
    const dynamicStyles = {
        '--widget-primary-color': settings.primaryColor || '#3F51B5',
        '--widget-background-color': settings.backgroundColor || '#F0F2F5',
    } as React.CSSProperties;


    if (!isOpen) {
        return (
            <div style={dynamicStyles}>
                <Button 
                    className="fixed bottom-4 right-4 h-16 w-16 rounded-full shadow-lg z-50 animate-in fade-in zoom-in-50 bg-[--widget-primary-color] hover:bg-[--widget-primary-color]/90"
                    onClick={() => setIsOpen(true)}
                    aria-label="打开聊天窗口"
                >
                    <MessageCircle className="h-8 w-8" />
                </Button>
            </div>
        );
    }
    
    return (
        <div style={dynamicStyles} className="fixed bottom-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-5">
            <Card className="w-full max-w-sm h-[60vh] md:h-[70vh] max-h-[700px] rounded-lg shadow-2xl flex flex-col overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between p-3 bg-[--widget-primary-color] text-primary-foreground">
                    <div className="flex items-center gap-3">
                        {settings.brandLogoUrl ? (
                            <Avatar className="h-9 w-9 border-2 border-primary-foreground/50 bg-white">
                                <Image src={settings.brandLogoUrl} alt="品牌标识" width={36} height={36} className="object-contain" />
                            </Avatar>
                        ) : (
                             <Avatar className="h-9 w-9 border-2 border-primary-foreground/50 flex items-center justify-center bg-white">
                                <Bot size={20} className="text-gray-600"/>
                            </Avatar>
                        )}
                        <div>
                            <p className="font-semibold text-base">{settings.workspaceName || '智聊通客服'}</p>
                            <p className="text-xs text-primary-foreground/80">
                               {isConnecting ? '正在连接...' : (pusherClient?.connection.state === 'connected' ? '在线' : '已离线')}
                            </p>
                        </div>
                    </div>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-primary-foreground hover:bg-white/20" 
                        onClick={() => setIsOpen(false)}
                        aria-label="关闭聊天窗口"
                    >
                        <X className="h-5 w-5" />
                    </Button>
                </CardHeader>
                <CardContent className="flex-1 p-4 overflow-y-auto space-y-4 bg-[--widget-background-color]">
                    {messages.map((message) => (
                        <div key={message.id} className={cn("flex items-end gap-2", message.sender === 'user' ? 'justify-end' : 'justify-start')}>
                             {message.sender !== 'user' && message.sender !== 'system' && (
                                <Avatar className="h-8 w-8">
                                    {settings.brandLogoUrl ? <AvatarImage src={settings.brandLogoUrl} alt="客服头像" /> : null}
                                    <AvatarFallback><Bot size={18}/></AvatarFallback>
                                </Avatar>
                            )}
                            {message.sender !== 'system' ? (
                                <div className={cn(
                                    "max-w-[75%] rounded-lg px-3 py-2 text-sm",
                                    message.sender === 'user' ? 'bg-[--widget-primary-color] text-primary-foreground rounded-br-none' : 'bg-card text-foreground rounded-bl-none shadow-sm'
                                )}>
                                    <p>{message.text}</p>
                                </div>
                            ) : (
                                <div className="text-xs text-muted-foreground text-center w-full">{message.text}</div>
                            )}

                            {message.sender === 'user' && (
                                <Avatar className="h-8 w-8">
                                    <AvatarFallback><User size={18}/></AvatarFallback>
                                </Avatar>
                            )}
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </CardContent>
                <CardFooter className="p-0 flex flex-col bg-card">
                    <Separator />
                    <div className="p-2 w-full flex items-center gap-2">
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" />
                        <Button variant="ghost" size="icon" disabled>
                            <Paperclip className="h-5 w-5 text-muted-foreground" />
                            <span className="sr-only">上传文件</span>
                        </Button>
                        <div className="relative flex-grow">
                            <Input
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSendMessage();
                                    }
                                }}
                                placeholder={isConnecting ? "正在连接..." : "输入您的问题..."}
                                className="pr-12"
                                disabled={isConnecting && !conversationId && !inputValue}
                            />
                            <Button 
                                onClick={handleSendMessage} 
                                size="icon" 
                                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 bg-[--widget-primary-color] hover:bg-[--widget-primary-color]/90"
                                disabled={!inputValue.trim() || (isConnecting && !conversationId)}
                            >
                                {isConnecting ? <Loader2 className="h-4 w-4 animate-spin"/> : <Send className="h-4 w-4" />}
                                <span className="sr-only">发送</span>
                            </Button>
                        </div>
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}

// Wrapper to provide Suspense boundary for useSearchParams
export default function ChatWidget() {
    return (
        <Suspense>
            <ChatWidgetContent />
        </Suspense>
    )
}
