
"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { Archive, Image as ImageIcon, Paperclip, Search, Send, Smile, User, CircleDot, MessageSquare, Zap, Loader2, Sparkles } from "lucide-react"
import Image from "next/image"
import { PlaceHolderImages } from "@/lib/placeholder-images"
import { Card, CardContent } from "@/components/ui/card"
import Pusher from 'pusher-js';
import { useSession } from "@/hooks/use-session"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import { useToast } from "@/hooks/use-toast"

type Message = {
  id: string;
  text: string | null;
  sender: 'agent' | 'customer' | 'user'; 
  timestamp: string;
  conversationId: string;
  metadata?: { imageUrl?: string };
};

type Conversation = {
  id: string;
  name: string;
  ipAddress?: string | null;
  messages: Message[];
  unread: number;
  isActive: boolean;
  updatedAt: string;
};

type LatestMessage = {
  text: string | null;
  timestamp: string;
  metadata?: { imageUrl?: string };
} | null;

type QuickReply = {
  id: string;
  content: string;
};

type Settings = {
  enableAiFeatures: boolean;
};

export default function WorkbenchPage() {
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Map<string, Conversation>>(new Map());
  const [latestMessages, setLatestMessages] = useState<Map<string, LatestMessage>>(new Map());
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const userAvatar = PlaceHolderImages.find(p => p.id === 'user-avatar')?.imageUrl;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { session, isLoading: isSessionLoading } = useSession();
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);
  
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [isGeneratingSuggestion, setIsGeneratingSuggestion] = useState(false);

  const selectedConversation = selectedConversationId ? conversations.get(selectedConversationId) : null;
  
  const fetchConversationHistory = async (convId: string) => {
    try {
      const response = await fetch(`/api/stream-chat?conversationId=${convId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch history: ${response.statusText}`);
      }
      const data: { messages: Message[], ipAddress?: string } = await response.json();
      if (data && data.messages) {
        setConversations(prev => {
          const newConvos = new Map(prev);
          const convo = newConvos.get(convId);
          if (convo) {
            // Filter out existing messages to avoid duplicates
            const convoMessages = Array.isArray(convo.messages) ? convo.messages : [];
            const dataMessages = Array.isArray(data.messages) ? data.messages : [];
            const existingMessageIds = new Set(convoMessages.map(m => m.id));
            const newMessages = dataMessages.filter(m => !existingMessageIds.has(m.id));
            newConvos.set(convId, { ...convo, messages: [...convoMessages, ...newMessages], ipAddress: data.ipAddress || convo.ipAddress });
          }
          return newConvos;
        });
        if(data.messages.length > 0) {
            const lastMsg = data.messages[data.messages.length - 1];
            setLatestMessages(prev => new Map(prev).set(convId, { text: lastMsg.text, timestamp: lastMsg.timestamp, metadata: lastMsg.metadata }));
        }
      }
    } catch (error) {
      console.error("Failed to fetch conversation history:", error);
    }
  };

  const handleSelectConversation = useCallback(async (id: string) => {
    setSelectedConversationId(id);
    setAiSuggestion(null); // Reset AI suggestion when changing conversation
    
    setConversations(prev => {
        const newConvos = new Map(prev);
        const convo = newConvos.get(id);
        if (convo) {
            newConvos.set(id, { ...convo, unread: 0 });
        }
        return newConvos;
    });

    const currentConvo = conversations.get(id);
    if (currentConvo && currentConvo.messages.length === 0) {
      await fetchConversationHistory(id);
    }

  }, [conversations]);

  useEffect(() => {
    if (isSessionLoading || !session?.userId) return;

    const fetchInitialData = async () => {
        try {
            const [convosRes, repliesRes, settingsRes] = await Promise.all([
                fetch(`/api/conversations`),
                fetch('/api/quick-replies'),
                fetch('/api/settings')
            ]);
            
            if (convosRes.ok) {
                const convosData: Conversation[] = await convosRes.json();
                const initialConversations = new Map(convosData.map(c => [c.id, {...c, messages: [], unread: c.unread || 0, ipAddress: c.ipAddress}]));
                setConversations(initialConversations);

                convosData.forEach(c => {
                  fetch(`/api/stream-chat?conversationId=${c.id}`)
                    .then(res => res.json())
                    .then(history => {
                      if (history.messages && history.messages.length > 0) {
                        const lastMsg = history.messages[history.messages.length - 1];
                        setLatestMessages(prev => new Map(prev).set(c.id, { text: lastMsg.text, timestamp: lastMsg.timestamp, metadata: lastMsg.metadata }));
                      }
                    });
                });
            } else {
              console.error("Failed to fetch conversations:", await convosRes.text());
            }

            if (repliesRes.ok) {
              const data = await repliesRes.json();
              setQuickReplies(data);
            }

             if (settingsRes.ok) {
                const data = await settingsRes.json();
                setSettings(data);
            }

        } catch (error) {
          console.error("Failed to fetch initial data:", error);
        }
    };

    fetchInitialData();
  }, [isSessionLoading, session?.userId]);

  useEffect(() => {
    if (!session?.userId) return;

    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
        authEndpoint: '/api/pusher-auth',
    });

    const agentChannelName = `private-agent-${session.userId}`;
    const agentChannel = pusher.subscribe(agentChannelName);
    
    agentChannel.bind('new-conversation', (data: Conversation) => {
      const newConvo = { ...data, messages: data.messages || [], unread: data.unread || 1 };
      setConversations(prev => new Map(prev).set(data.id, newConvo));
      if(newConvo.messages.length > 0) {
        const lastMsg = newConvo.messages[newConvo.messages.length - 1];
        setLatestMessages(prev => new Map(prev).set(data.id, { text: lastMsg.text, timestamp: lastMsg.timestamp, metadata: lastMsg.metadata }));
      }
    });

    agentChannel.bind('new-message', (msg: Message & { conversationName?: string, conversationIp?: string }) => {
        if (msg.sender === 'agent') return; 

        setConversations(prev => {
            const newConvos = new Map(prev);
            let convo = newConvos.get(msg.conversationId);
            if (convo) {
                const convoMessages = Array.isArray(convo.messages) ? convo.messages : [];
                const messageExists = convoMessages.some(m => m.id === msg.id);
                if (messageExists) return newConvos; // Don't add duplicate message
                
                const newMessages = [...convoMessages, msg];
                const isSelected = msg.conversationId === selectedConversationId;
                const unread = !isSelected ? (convo.unread || 0) + 1 : convo.unread;
                newConvos.set(msg.conversationId, { ...convo, messages: newMessages, unread, ipAddress: msg.conversationIp || convo.ipAddress, updatedAt: new Date().toISOString() });
            } else {
                convo = {
                  id: msg.conversationId,
                  name: msg.conversationName || "New Conversation",
                  ipAddress: msg.conversationIp,
                  messages: [msg],
                  unread: 1,
                  isActive: true,
                  updatedAt: new Date().toISOString(),
                };
                newConvos.set(msg.conversationId, convo);
            }
            // Re-sort the conversation list to bring the updated one to the top
            const sortedConvos = new Map(Array.from(newConvos.values()).sort((a, b) => {
                 if (a.id === msg.conversationId) return -1;
                 if (b.id === msg.conversationId) return 1;
                 return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
             }).map(c => [c.id, c]));

            return sortedConvos;
        });
        setLatestMessages(prev => new Map(prev).set(msg.conversationId, { text: msg.text, timestamp: msg.timestamp, metadata: msg.metadata }));
    });
    
    agentChannel.bind('conversation-archived', ({ conversationId }: { conversationId: string }) => {
        setConversations(prev => {
            const newConvos = new Map(prev);
            newConvos.delete(conversationId);
            return newConvos;
        });
        if (selectedConversationId === conversationId) {
            setSelectedConversationId(null);
        }
    });


    return () => {
        pusher.disconnect();
    }
  }, [session?.userId, selectedConversationId]);


  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedConversation?.messages]);


  const sendMessageToServer = async (text: string | null, imageUrl?: string) => {
    if ((!text || !text.trim()) && !imageUrl) return;
    if (!selectedConversationId) return;

     const optimisticMessage: Message = {
      id: crypto.randomUUID(),
      text: text,
      sender: 'agent',
      timestamp: new Date().toISOString(),
      conversationId: selectedConversationId,
      metadata: imageUrl ? { imageUrl } : undefined,
    };

    setConversations(prev => {
      const newConvos = new Map(prev);
      const convo = newConvos.get(selectedConversationId);
      if (convo) {
        newConvos.set(selectedConversationId, { ...convo, messages: [...convo.messages, optimisticMessage], updatedAt: new Date().toISOString() });
      }
      return newConvos;
    });

    setLatestMessages(prev => new Map(prev).set(selectedConversationId, { text: text || '📷 图片', timestamp: optimisticMessage.timestamp, metadata: optimisticMessage.metadata }));
    if (!imageUrl) {
        setInputValue('');
    }

    try {
      await fetch('/api/stream-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          imageUrl: imageUrl,
          conversationId: selectedConversationId,
          role: 'agent',
        }),
      });
    } catch (error) {
      console.error("Failed to send message:", error);
      setConversations(prev => {
        const newConvos = new Map(prev);
        const convo = newConvos.get(selectedConversationId);
        if (convo) {
          const convoMessages = Array.isArray(convo.messages) ? convo.messages : [];
          newConvos.set(selectedConversationId, { ...convo, messages: convoMessages.filter(m => m.id !== optimisticMessage.id) });
        }
        return newConvos;
      });
    }
  };
  
  const handleArchiveConversation = async () => {
    if (!selectedConversationId) return;

    const originalConversations = new Map(conversations);
    
    // Optimistic UI update
    const newConvos = new Map(conversations);
    newConvos.delete(selectedConversationId);
    setConversations(newConvos);
    setSelectedConversationId(null);
    
    try {
        await fetch(`/api/stream-chat?id=${selectedConversationId}`, { 
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error("Failed to archive conversation:", error);
        // Revert on failure
        setConversations(originalConversations);
        setSelectedConversationId(selectedConversationId);
    }
  };

  const handleSendMessage = () => {
    sendMessageToServer(inputValue);
  };
  
  const onFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedConversationId) return;

    setIsUploading(true);
    
    try {
      const response = await fetch(`/api/upload?filename=${file.name}`, {
        method: 'POST',
        body: file,
      });

      if (!response.ok) {
        throw new Error('Image upload failed');
      }

      const { url: imageUrl } = await response.json();
      await sendMessageToServer(null, imageUrl);

    } catch (error) {
      console.error("Failed to upload and send image:", error);
    } finally {
      setIsUploading(false);
      if(fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleQuickReplySend = (content: string) => {
    sendMessageToServer(content);
  }
  
  const onEmojiClick = (emojiData: EmojiClickData, event: MouseEvent) => {
    setInputValue(prevInput => prevInput + emojiData.emoji);
    setIsEmojiPickerOpen(false);
  };

  const handleImageUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleGenerateAiSuggestion = async () => {
    if (!selectedConversation) return;

    const lastCustomerMessage = [...selectedConversation.messages].reverse().find(m => m.sender === 'customer');
    if (!lastCustomerMessage || !lastCustomerMessage.text) {
        toast({
            variant: "destructive",
            title: "无法生成建议",
            description: "对话中没有找到客户的最新消息。",
        });
        return;
    }

    setIsGeneratingSuggestion(true);
    setAiSuggestion(null);
    try {
        const response = await fetch('/api/ai/generate-quick-reply', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ customerMessage: lastCustomerMessage.text }),
        });

        if (!response.ok) throw new Error('AI建议生成失败');

        const { suggestion } = await response.json();
        setAiSuggestion(suggestion);
    } catch (error: any) {
        console.error(error);
        toast({
            variant: "destructive",
            title: "AI建议生成失败",
            description: error.message || "无法连接到AI服务，请稍后再试。",
        });
    } finally {
        setIsGeneratingSuggestion(false);
    }
  };


  const conversationArray = Array.from(conversations.values()).sort((a, b) => {
    if (a.unread > 0 && b.unread === 0) return -1;
    if (b.unread > 0 && a.unread === 0) return 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  return (
    <div className="h-[calc(100vh-60px-3rem)] grid md:grid-cols-[300px_1fr] lg:grid-cols-[350px_1fr]">
      <div className="border-r bg-card flex flex-col h-full overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="text-xl font-bold font-headline">对话列表</h2>
          <div className="relative mt-2">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="搜索对话..." className="pl-8" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {isSessionLoading && <p className="p-4 text-sm text-muted-foreground">正在加载...</p>}
          {!isSessionLoading && conversationArray.length === 0 && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              <MessageSquare className="mx-auto h-10 w-10 mb-2"/>
              <p>暂无活跃对话</p>
              <p className="text-xs">从客户窗口发起新对话来开始测试。</p>
            </div>
          )}
          {conversationArray.map((convo) => {
            const latestMessage = latestMessages.get(convo.id);
            const displayMessage = latestMessage?.metadata?.imageUrl ? '📷 图片' : latestMessage?.text;

            return (
              <div
                key={convo.id}
                className={cn(
                  "flex items-center gap-3 p-3 cursor-pointer border-l-4",
                  selectedConversationId === convo.id
                    ? "bg-muted border-primary"
                    : "border-transparent hover:bg-muted/50"
                )}
                onClick={() => handleSelectConversation(convo.id)}
              >
                 <Avatar className="h-10 w-10 relative">
                   <AvatarImage src={`https://picsum.photos/seed/${convo.id}/40/40`} alt={convo.name} />
                  <AvatarFallback>{convo.name.charAt(0)}</AvatarFallback>
                  {convo.isActive && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-card" />}
                </Avatar>
                <div className="flex-1 overflow-hidden">
                  <div className="flex justify-between items-center">
                     <h3 className="font-semibold truncate">
                        {convo.name}
                        {convo.ipAddress && <span className="text-xs text-muted-foreground ml-2 font-normal">{convo.ipAddress}</span>}
                    </h3>
                    {latestMessage && <span className="text-xs text-muted-foreground">{new Date(latestMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                  </div>
                  <div className="flex justify-between items-start">
                    <p className="text-sm text-muted-foreground truncate">{displayMessage || '...新会话...'}</p>
                    {convo.unread > 0 && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                        {convo.unread}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
       <div className="flex flex-col h-full bg-background overflow-hidden">
        {selectedConversation ? (
          <>
            <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
              <div>
                 <h3 className="text-lg font-semibold font-headline flex items-center gap-2">
                    {selectedConversation.name}
                    {selectedConversation.ipAddress && <span className="text-sm text-muted-foreground font-normal">({selectedConversation.ipAddress})</span>}
                  {selectedConversation.isActive ? 
                    <span className="text-xs text-green-600 flex items-center gap-1"><CircleDot className="h-3 w-3 fill-green-500 text-green-600" /> 在线</span> : 
                    <span className="text-xs text-muted-foreground">已离线</span>
                  }
                </h3>
              </div>
              <Button variant="outline" size="icon" onClick={handleArchiveConversation}>
                <Archive className="h-4 w-4" />
                <span className="sr-only">归档对话</span>
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {Array.isArray(selectedConversation.messages) ? selectedConversation.messages.map((msg) => (
                <div key={msg.id} className={cn("flex items-end gap-2", msg.sender === 'agent' ? 'justify-end' : 'justify-start')}>
                  {msg.sender === 'customer' && (
                    <Avatar className="h-8 w-8">
                       <AvatarImage src={`https://picsum.photos/seed/${selectedConversation.id}/40/40`} alt={selectedConversation.name} />
                      <AvatarFallback>{selectedConversation.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                  )}
                  <div className={cn(
                      "max-w-[70%] rounded-lg",
                       msg.metadata?.imageUrl ? "p-0 bg-transparent" : "px-4 py-2",
                      msg.sender === 'agent' ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-muted text-card-foreground rounded-bl-none'
                  )}>
                     {msg.metadata?.imageUrl ? (
                        <Image src={msg.metadata.imageUrl} alt="用户上传的图片" width={200} height={200} className="rounded-lg object-cover" />
                      ) : (
                        <p>{msg.text}</p>
                      )}
                  </div>
                  {msg.sender === 'agent' && (
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={userAvatar} alt="Agent" />
                      <AvatarFallback><User size={18} /></AvatarFallback>
                    </Avatar>
                  )}
                </div>
              )) : null}
              <div ref={messagesEndRef} />
            </div>
            <div className="p-4 border-t bg-card flex-shrink-0">
              <Card>
                <CardContent className="p-2">
                    <Textarea
                        placeholder={selectedConversation.isActive ? "输入您的回复..." : "客户已离线，无法发送消息。"}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage();
                            }
                        }}
                        className="w-full border-0 focus-visible:ring-0 resize-none bg-transparent"
                        disabled={!selectedConversation.isActive || isUploading}
                    />
                    <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-1">
                            <Popover open={isEmojiPickerOpen} onOpenChange={setIsEmojiPickerOpen}>
                                <PopoverTrigger asChild>
                                    <Button variant="ghost" size="icon" disabled={!selectedConversation.isActive}>
                                        <Smile className="h-5 w-5 text-muted-foreground" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 border-0">
                                    <EmojiPicker onEmojiClick={onEmojiClick} />
                                </PopoverContent>
                            </Popover>
                            <input type="file" ref={fileInputRef} onChange={onFileSelect} className="hidden" accept="image/*" />
                            <Button variant="ghost" size="icon" disabled={!selectedConversation.isActive || isUploading} onClick={handleImageUploadClick}>
                               {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImageIcon className="h-5 w-5 text-muted-foreground" />}
                            </Button>
                            
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="ghost" size="icon" disabled={!selectedConversation.isActive}>
                                        <Paperclip className="h-5 w-5 text-muted-foreground" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-80 p-0">
                                    <Command>
                                        <CommandInput placeholder="搜索快捷回复..." />
                                        <CommandList>
                                            <CommandGroup heading="快捷回复">
                                                {quickReplies.length === 0 ? (
                                                     <CommandEmpty>没有找到快捷回复。</CommandEmpty>
                                                ) : (
                                                    quickReplies.map((reply) => (
                                                    <CommandItem
                                                        key={reply.id}
                                                        onSelect={() => {
                                                            handleQuickReplySend(reply.content);
                                                            // Close the popover
                                                            document.body.click();
                                                        }}
                                                        className="cursor-pointer"
                                                    >
                                                        <span className="truncate">{reply.content}</span>
                                                    </CommandItem>
                                                    ))
                                                )}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                            
                            {settings?.enableAiFeatures && (
                                <Popover onOpenChange={() => setAiSuggestion(null)}>
                                    <PopoverTrigger asChild>
                                        <Button variant="ghost" size="icon" disabled={!selectedConversation.isActive || isGeneratingSuggestion}>
                                            {isGeneratingSuggestion ? <Loader2 className="h-5 w-5 animate-spin" /> : <Zap className="h-5 w-5 text-muted-foreground" />}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-80 p-0">
                                        <Command>
                                            <CommandList>
                                                <CommandGroup heading="AI建议">
                                                    <CommandItem
                                                        onSelect={handleGenerateAiSuggestion}
                                                        className="cursor-pointer"
                                                        disabled={isGeneratingSuggestion}
                                                    >
                                                        <Sparkles className="mr-2 h-4 w-4 text-yellow-500" />
                                                        <span>生成回复建议</span>
                                                    </CommandItem>
                                                    {aiSuggestion && (
                                                        <CommandItem
                                                            onSelect={() => {
                                                                handleQuickReplySend(aiSuggestion)
                                                                document.body.click();
                                                            }}
                                                            className="cursor-pointer text-blue-600 whitespace-normal h-auto"
                                                        >
                                                            {aiSuggestion}
                                                        </CommandItem>
                                                    )}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            )}
                        </div>
                        <Button onClick={handleSendMessage} disabled={!inputValue.trim() || !selectedConversation.isActive || isUploading}>
                            发送回复 <Send className="ml-2 h-4 w-4" />
                        </Button>
                    </div>
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <MessageSquare className="h-16 w-16 mb-4" />
            <p className="text-lg font-medium">请从左侧选择一个对话</p>
            <p className="text-sm">或者等待分配给您的新会话。</p>
          </div>
        )}
      </div>
    </div>
  )
}

    