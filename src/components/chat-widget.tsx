
"use client"

import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Bot, User, CornerDownLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { cn } from '@/lib/utils';
import { Separator } from './ui/separator';
import { Input } from './ui/input';
import Image from 'next/image';

type Message = {
  id: string;
  text: string;
  sender: 'user' | 'bot' | 'agent' | 'system';
  timestamp: string;
  senderStreamId?: string;
};

export default function ChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { id: 'initial-message', text: '您好！我是智聊通智能客服，有什么可以帮助您的吗？', sender: 'bot', timestamp: new Date().toISOString() },
    ]);
    const [inputValue, setInputValue] = useState('');
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [streamId, setStreamId] = useState<string | null>(null);
    const [isConnecting, setIsConnecting] = useState(false);

    const eventSourceRef = useRef<EventSource | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const brandLogo = PlaceHolderImages.find(p => p.id === 'brand-logo');

    const startStreaming = (convId: string | null) => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      setIsConnecting(true);

      const url = `/api/stream-chat?role=customer${convId ? `&conversationId=${convId}` : ''}`;
      const es = new EventSource(url);
      eventSourceRef.current = es;

      es.onopen = () => {
        setIsConnecting(false);
        console.log("Customer stream connected.");
      };

      es.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'connected') {
            setStreamId(data.streamId);
        } else if (data.type === 'newMessage') {
            const msg = data.message as Message;
            // Only add message if it's not from this client
            if (msg.senderStreamId !== streamId) {
                setMessages((prev) => [...prev, msg]);
            }
        } else if (data.type !== 'ping') {
             // You can handle other event types here if needed
        }
      };

      es.onerror = (error) => {
          console.error("EventSource failed:", error);
          setIsConnecting(false);
          setMessages(prev => [...prev, { id: 'error-msg', text: `连接中断`, sender: 'system', timestamp: new Date().toISOString() }]);
          es.close();
      };
    };

    useEffect(() => {
        if (isOpen) {
            startStreaming(conversationId);
        } else {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
                eventSourceRef.current = null;
                setStreamId(null);
                setIsConnecting(false);
            }
        }
        return () => {
            eventSourceRef.current?.close();
        };
    }, [isOpen]);

    useEffect(() => {
      if (conversationId && isOpen) {
        startStreaming(conversationId);
      }
    }, [conversationId]);


    useEffect(() => {
        if (isOpen) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isOpen]);

    const handleSendMessage = async () => {
        if (!inputValue.trim() || !streamId) return;

        const userMessage: Message = {
            id: crypto.randomUUID(),
            text: inputValue,
            sender: 'user',
            timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, userMessage]);
        
        try {
            const response = await fetch('/api/stream-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                  message: inputValue, 
                  conversationId: conversationId,
                  role: 'customer',
                  senderName: `访客 ${streamId?.substring(0, 6) || ''}`,
                  streamId: streamId
                }),
            });
            if (!response.ok) throw new Error('发送失败');

            if (!conversationId) {
              const { newConversationId } = await response.json();
              setConversationId(newConversationId);
            }

        } catch (error: any) {
             setMessages((prev) => [...prev, {
                id: crypto.randomUUID(),
                text: `发送失败: ${error.message}`,
                sender: 'system',
                timestamp: new Date().toISOString()
            }]);
        }
        setInputValue('');
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
                                {isConnecting ? '正在连接...' : (streamId ? '在线' : '已离线')}
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
                    <div className="p-2.5 w-full">
                         <div className="relative">
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
                                disabled={isConnecting || !streamId}
                            />
                            <Button 
                                onClick={handleSendMessage} 
                                size="icon" 
                                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                                disabled={!inputValue.trim() || isConnecting || !streamId}
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
