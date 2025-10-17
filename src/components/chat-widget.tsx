"use client"

import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Image as ImageIcon, Send, Bot, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { cn } from '@/lib/utils';
import { Separator } from './ui/separator';
import { Textarea } from './ui/textarea';
import Image from 'next/image';

type Message = {
  id: number | string;
  text: string;
  sender: 'user' | 'bot' | 'other';
  avatar: string;
  senderId?: string;
};

export default function ChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { id: 1, text: '您好！我是智聊通智能客服，有什么可以帮助您的吗？', sender: 'bot', avatar: PlaceHolderImages.find(p => p.id === 'brand-logo')?.imageUrl || '' },
    ]);
    const [inputValue, setInputValue] = useState('');
    const [streamId, setStreamId] = useState<string | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const brandLogo = PlaceHolderImages.find(p => p.id === 'brand-logo');
    
    // Mock settings
    const showBrandLogo = true;
    const autoOpenWidget = false; // Let's not auto-open for testing
    const allowImageUpload = true;

    const startStreaming = async () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        
        abortControllerRef.current = new AbortController();
        
        try {
            const response = await fetch('/api/stream-chat', {
                method: 'GET',
                signal: abortControllerRef.current.signal,
            });

            if (!response.body || !response.ok) {
                throw new Error('无法建立流连接。');
            }

            const receivedStreamId = response.headers.get('X-Stream-Id');
            if (!receivedStreamId) {
                throw new Error('未收到流 ID。');
            }
            setStreamId(receivedStreamId);
            
            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value);
                const lines = chunk.split('\n\n').filter(Boolean);

                lines.forEach(line => {
                    if (line.startsWith('data: ')) {
                        const data = line.substring(6);
                        
                        const senderPrefix = `来自 ${receivedStreamId.substring(0, 6)}:`;
                        // Ignore welcome message and self-sent messages
                        if (data.startsWith('来自') && !data.startsWith(senderPrefix)) {
                             setMessages((prev) => [...prev, {
                                id: Date.now() + Math.random(),
                                text: data,
                                sender: 'other',
                                avatar: `https://picsum.photos/seed/${data.substring(3,9)}/40/40`,
                                senderId: data.substring(3,9)
                            }]);
                        }
                    }
                });
            }
        } catch (error: any) {
            if (error.name !== 'AbortError') {
                console.error("Streaming error:", error);
            }
        }
    };

    useEffect(() => {
        if (isOpen) {
            startStreaming();
        } else {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
                abortControllerRef.current = null;
                setStreamId(null);
            }
        }

        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [isOpen]);

    useEffect(() => {
        if (isOpen) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isOpen]);
    

    const handleSendMessage = async () => {
        if (!inputValue.trim() || !streamId) return;

        const userMessage: Message = {
            id: Date.now(),
            text: inputValue,
            sender: 'user',
            avatar: ''
        };
        setMessages(prev => [...prev, userMessage]);

        try {
            await fetch('/api/stream-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: inputValue, streamId }),
            });
        } catch (error: any) {
             setMessages((prev) => [...prev, {
                id: Date.now() + 1,
                text: `发送失败: ${error.message}`,
                sender: 'bot',
                avatar: ''
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
                        {showBrandLogo && brandLogo && (
                            <Avatar className="h-9 w-9 border-2 border-primary-foreground/50">
                                <Image src={brandLogo.imageUrl} alt="品牌标识" width={36} height={36} data-ai-hint={brandLogo.imageHint} />
                            </Avatar>
                        )}
                        <div>
                            <p className="font-semibold text-base">智聊通客服</p>
                            <p className="text-xs text-primary-foreground/80">您的ID: {streamId?.substring(0, 6)}</p>
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
                <CardContent className="flex-1 p-4 overflow-y-auto space-y-4">
                    {messages.map((message) => (
                        <div key={message.id} className={cn("flex items-end gap-2", message.sender === 'user' ? 'justify-end' : 'justify-start')}>
                             {(message.sender === 'bot' || message.sender === 'other') && (
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={message.avatar} alt="客服头像" />
                                    <AvatarFallback><Bot size={18}/></AvatarFallback>
                                </Avatar>
                            )}
                            <div className={cn(
                                "max-w-[75%] rounded-lg px-3 py-2 text-sm",
                                message.sender === 'user' ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-muted text-foreground rounded-bl-none'
                            )}>
                                <p>{message.text}</p>
                            </div>
                            {message.sender === 'user' && (
                                <Avatar className="h-8 w-8">
                                    <AvatarFallback><User size={18}/></AvatarFallback>
                                </Avatar>
                            )}
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </CardContent>
                <CardFooter className="p-0 flex flex-col">
                    <Separator />
                    <div className="p-3 w-full space-y-2">
                        <Textarea
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage();
                                }
                            }}
                            placeholder={streamId ? "输入您的问题..." : "正在连接..."}
                            className="bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 resize-none h-12"
                            rows={1}
                            disabled={!streamId}
                        />
                         <div className="flex justify-between items-center">
                            {allowImageUpload ? (
                                <Button variant="ghost" size="icon" className="text-muted-foreground">
                                    <ImageIcon className="h-5 w-5" />
                                </Button>
                            ) : <div></div>}
                            <Button onClick={handleSendMessage} size="sm" disabled={!inputValue.trim() || !streamId}>
                                发送 <Send className="ml-2 h-4 w-4" />
                            </Button>
                         </div>
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}
