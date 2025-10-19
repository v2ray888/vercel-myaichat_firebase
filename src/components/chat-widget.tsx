

"use client"

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { MessageCircle, X, Send, Bot, User, Paperclip, Loader2, Image as ImageIcon, Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Separator } from './ui/separator';
import { Input } from './ui/input';
import Image from 'next/image';
import Pusher from 'pusher-js';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';


type Message = {
  id: string;
  text: string | null;
  sender: 'user' | 'bot' | 'agent' | 'system';
  timestamp: string;
  metadata?: { imageUrl?: string };
};

type WidgetSettings = {
    id: string;
    welcomeMessage: string;
    offlineMessage: string;
    autoOpenWidget: boolean;
    brandLogoUrl: string | null;
    primaryColor: string;
    backgroundColor: string;
    workspaceName: string;
    allowCustomerImageUpload: boolean;
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
    const [isUploading, setIsUploading] = useState(false);
    const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
    
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
                console.log('API response data:', data);
                // 确保 messages 是数组，防止 t.map is not a function 错误
                const messagesArray = Array.isArray(data?.messages) ? data.messages : [];
                console.log('Messages array:', messagesArray);
                if (messagesArray.length > 0) {
                     const historyMessages = messagesArray.map((msg: any) => ({...msg, sender: msg.sender === 'customer' ? 'user' : (msg.sender || 'agent')}));
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
    
    const sendMessageToServer = async (text: string | null, imageUrl?: string) => {
        if (!settings || ((!text || !text.trim()) && !imageUrl)) return;

        const userMessage: Message = {
            id: crypto.randomUUID(),
            text: text,
            sender: 'user',
            timestamp: new Date().toISOString(),
            metadata: imageUrl ? { imageUrl } : undefined,
        };
        setMessages(prev => [...prev, userMessage]);
        if (!imageUrl) {
            setInputValue('');
        }
        
        try {
            const response = await fetch('/api/stream-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                  message: text, 
                  imageUrl: imageUrl,
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

    const handleSendMessage = () => {
        sendMessageToServer(inputValue);
    };

    const onFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsUploading(true);

        try {
            const response = await fetch(`/api/upload?filename=${file.name}`, {
                method: 'POST',
                body: file,
            });

            if (!response.ok) {
                throw new Error('图片上传失败');
            }

            const { url: imageUrl } = await response.json();
            await sendMessageToServer(null, imageUrl);

        } catch (error: any) {
            console.error("图片上传和发送失败:", error);
            setMessages((prev) => [...prev, {
                id: crypto.randomUUID(),
                text: `图片发送失败: ${error.message}`,
                sender: 'system',
                timestamp: new Date().toISOString()
            }]);
        } finally {
            setIsUploading(false);
            if(fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };
    
    const onEmojiClick = (emojiData: EmojiClickData, event: MouseEvent) => {
        setInputValue(prevInput => prevInput + emojiData.emoji);
        setIsEmojiPickerOpen(false);
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
                        <Avatar className="h-9 w-9 border-2 border-primary-foreground/50 flex items-center justify-center bg-white">
                           {settings.brandLogoUrl ? <AvatarImage src={settings.brandLogoUrl} alt="Logo" /> : <Bot size={20} className="text-gray-600"/>}
                           <AvatarFallback><Bot size={20} className="text-gray-600"/></AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="font-semibold text-base">{settings.workspaceName || '智聊通客服'}</p>
                            <p className="text-xs text-primary-foreground/80">
                               {isConnecting ? '正在连接...' : ((pusherClient as any)?.connection?.state === 'connected' ? '在线' : settings.offlineMessage)}
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
                    {Array.isArray(messages) ? messages.map((message) => (
                        <div key={message.id} className={cn("flex items-end gap-2", message.sender === 'user' ? 'justify-end' : 'justify-start')}>
                             {message.sender !== 'user' && message.sender !== 'system' && (
                                <Avatar className="h-8 w-8">
                                    {settings.brandLogoUrl ? <AvatarImage src={settings.brandLogoUrl} alt="客服头像" /> : null}
                                    <AvatarFallback><Bot size={18}/></AvatarFallback>
                                </Avatar>
                            )}
                            {message.sender !== 'system' ? (
                                <div className={cn(
                                    "max-w-[75%] rounded-lg",
                                    message.metadata?.imageUrl ? "p-0 bg-transparent" : "px-3 py-2 text-sm",
                                    message.sender === 'user' ? 'bg-[--widget-primary-color] text-primary-foreground rounded-br-none' : 'bg-card text-foreground rounded-bl-none shadow-sm'
                                )}>
                                    {message.metadata?.imageUrl ? (
                                        <Image src={message.metadata.imageUrl} alt="用户上传的图片" width={200} height={200} className="rounded-lg object-cover" />
                                    ) : (
                                        <p>{message.text}</p>
                                    )}
                                </div>
                            ) : (
                                <div className="text-xs text-muted-foreground text-center w-full">{message.text}</div>
                            )}

                            {message.sender === 'user' && (
                                <Avatar className="h-8 w-8">
                                    {conversationId && <AvatarImage src={`https://picsum.photos/seed/${conversationId}/40/40`} alt="User" />}
                                    <AvatarFallback><User size={18}/></AvatarFallback>
                                </Avatar>
                            )}
                        </div>
                    )) : null}
                    <div ref={messagesEndRef} />
                </CardContent>
                <CardFooter className="p-0 flex flex-col bg-card">
                    <Separator />
                    <div className="p-2 w-full flex items-center gap-1">
                         <Popover open={isEmojiPickerOpen} onOpenChange={setIsEmojiPickerOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" size="icon">
                                    <Smile className="h-5 w-5 text-muted-foreground" />
                                    <span className="sr-only">打开表情选择</span>
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 border-0" side="top" align="start">
                                <EmojiPicker onEmojiClick={onEmojiClick} />
                            </PopoverContent>
                        </Popover>
                        <input type="file" ref={fileInputRef} onChange={onFileSelect} className="hidden" accept="image/*" />
                        <Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} disabled={isUploading || !settings.allowCustomerImageUpload}>
                            {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Paperclip className="h-5 w-5 text-muted-foreground" />}
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
                                <Send className="h-4 w-4" />
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
