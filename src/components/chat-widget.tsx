
"use client"

import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Bot, User, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PlaceHolderImages } from '@/lib/placeholder-images';
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

// Ensure this is initialized only once per client
let pusherClient: Pusher | null = null;

const getPusherClient = () => {
    if (!pusherClient) {
        pusherClient = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
            cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
            authEndpoint: '/api/pusher-auth',
             auth: {
                headers: { 'Content-Type': 'application/json' },
            }
        });
    }
    return pusherClient;
}


export default function ChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { id: 'initial-message', text: '您好！我是智聊通智能客服，有什么可以帮助您的吗？', sender: 'bot', timestamp: new Date().toISOString() },
    ]);
    const [inputValue, setInputValue] = useState('');
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [isConnecting, setIsConnecting] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const brandLogo = PlaceHolderImages.find(p => p.id === 'brand-logo');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const subscribeToChannel = (convId: string) => {
        const pusher = getPusherClient();
        const channelName = `private-conversation-${convId}`;
        
        // Unsubscribe from any old channel
        if (pusher.channel(channelName)) {
           pusher.unsubscribe(channelName);
        }
        
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

        channel.bind('new-message', (msgData: Message) => {
            const msg = typeof msgData === 'string' ? JSON.parse(msgData) : msgData;
            if (msg.sender === 'agent') {
                setMessages((prev) => [...prev, msg]);
            }
        });
    }
    
    useEffect(() => {
        if (isOpen) {
            // Restore conversation ID from session storage if it exists
            const storedConvId = sessionStorage.getItem('chat-conversation-id');
            if (storedConvId) {
                setConversationId(storedConvId);
                subscribeToChannel(storedConvId);
                // fetch history - temporarily disabled until backend is persistent
                /*
                 fetch(`/api/stream-chat?conversationId=${storedConvId}`).then(res => res.json()).then(data => {
                    if (data && data.messages && data.messages.length > 0) {
                        const historyMessages = data.messages.map((msg: any) => ({...msg, sender: msg.sender === 'user' ? 'user' : 'agent'}));
                        setMessages(prev => [prev[0], ...historyMessages]);
                    }
                 })
                 */
            }
        } else {
            if (pusherClient && conversationId) {
                pusherClient.unsubscribe(`private-conversation-${conversationId}`);
            }
        }

        return () => {
             if (pusherClient && conversationId) {
                pusherClient.unsubscribe(`private-conversation-${conversationId}`);
             }
        };
    }, [isOpen]);

    useEffect(() => {
        if (isOpen) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isOpen]);

    const handleSendMessage = async () => {
        if (!inputValue.trim()) return;

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
                  senderName: `访客 ${conversationId?.substring(0, 6) || '新'}`,
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

    const handleImageUpload = () => {
      fileInputRef.current?.click();
    };

    const onFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      // TODO: Implement actual file upload logic
      console.log("Selected file:", file.name);
      // For now, just send a text message indicating a file was "sent"
      setInputValue(`[文件: ${file.name}]`);
      // Reset file input
      event.target.value = '';
    };

    if (!isOpen) {
        return (
            <Button 
                className="fixed bottom-4 right-4 h-16 w-16 rounded-full shadow-lg z-50 animate-in fade-in zoom-in-50"
                onClick={() => setIsOpen(true)}
                aria-label="打开聊天窗口"
            >
                <MessageCircle className="h-8 w-8" />
            </Button>
        );
    }

    return (
        <div className="fixed bottom-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-5">
            <Card className="w-full max-w-sm h-[60vh] md:h-[70vh] max-h-[700px] shadow-2xl flex flex-col rounded-lg overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between p-3 bg-primary text-primary-foreground">
                    <div className="flex items-center gap-3">
                        {brandLogo && (
                            <Avatar className="h-9 w-9 border-2 border-primary-foreground/50">
                                <Image src={brandLogo.imageUrl} alt="品牌标识" width={36} height={36} data-ai-hint={brandLogo.imageHint} />
                            </Avatar>
                        )}
                        <div>
                            <p className="font-semibold text-base">智聊通客服</p>
                            <p className="text-xs text-primary-foreground/80">
                                {isConnecting ? '正在连接...' : (pusherClient?.connection.state === 'connected' ? '在线' : '已离线')}
                            </p>
                        </div>
                    </div>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-primary-foreground hover:bg-primary/80" 
                        onClick={() => setIsOpen(false)}
                        aria-label="关闭聊天窗口"
                    >
                        <X className="h-5 w-5" />
                    </Button>
                </CardHeader>
                <CardContent className="flex-1 p-4 overflow-y-auto space-y-4 bg-background">
                    {messages.map((message) => (
                        <div key={message.id} className={cn("flex items-end gap-2", message.sender === 'user' ? 'justify-end' : 'justify-start')}>
                             {message.sender !== 'user' && message.sender !== 'system' && (
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={brandLogo?.imageUrl} alt="客服头像" />
                                    <AvatarFallback><Bot size={18}/></AvatarFallback>
                                </Avatar>
                            )}
                            {message.sender !== 'system' ? (
                                <div className={cn(
                                    "max-w-[75%] rounded-lg px-3 py-2 text-sm",
                                    message.sender === 'user' ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-muted text-foreground rounded-bl-none'
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
                        <input type="file" ref={fileInputRef} onChange={onFileSelect} className="hidden" accept="image/*" />
                        <Button variant="ghost" size="icon" onClick={handleImageUpload} disabled={isConnecting && !conversationId}>
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
                                disabled={isConnecting && !conversationId}
                            />
                            <Button 
                                onClick={handleSendMessage} 
                                size="icon" 
                                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
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

