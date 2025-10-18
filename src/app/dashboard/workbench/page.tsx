
"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { Archive, Image as ImageIcon, Paperclip, Search, Send, Smile, User, CircleDot, MessageSquare, Zap, Loader2 } from "lucide-react"
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

type Message = {
  id: string;
  text: string | null;
  sender: 'agent' | 'customer' | 'user'; // user is for local optimistic updates
  timestamp: string;
  conversationId: string;
  metadata?: { imageUrl?: string };
};

type Conversation = {
  id: string;
  name: string;
  messages: Message[];
  unread: number;
  isActive: boolean;
  updatedAt: string; // Added for sorting
};

// Represents the latest message for display in the conversation list
type LatestMessage = {
  text: string | null;
  timestamp: string;
  metadata?: { imageUrl?: string };
} | null;

type QuickReply = {
  id: string;
  content: string;
};

export default function WorkbenchPage() {
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
  
  const selectedConversation = selectedConversationId ? conversations.get(selectedConversationId) : null;
  
  const fetchConversationHistory = async (convId: string) => {
    try {
      const response = await fetch(`/api/stream-chat?conversationId=${convId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch history: ${response.statusText}`);
      }
      const data: { messages: Message[] } = await response.json();
      if (data && data.messages) {
        setConversations(prev => {
          const newConvos = new Map(prev);
          const convo = newConvos.get(convId);
          if (convo) {
            newConvos.set(convId, { ...convo, messages: data.messages });
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

    const fetchAllConversations = async () => {
        try {
            const response = await fetch(`/api/conversations`);
            if (response.ok) {
                const convosData: Conversation[] = await response.json();
                const initialConversations = new Map(convosData.map(c => [c.id, {...c, messages: [], unread: c.unread || 0}]));
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
              console.error("Failed to fetch conversations:", await response.text());
            }
        } catch (error) {
          console.error("Failed to fetch conversations:", error);
        }
    };
    
    const fetchQuickReplies = async () => {
      try {
        const response = await fetch('/api/quick-replies');
        if (response.ok) {
          const data = await response.json();
          setQuickReplies(data);
        }
      } catch (error) {
        console.error("Failed to fetch quick replies:", error);
      }
    };

    fetchAllConversations();
    fetchQuickReplies();
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
      setConversations(prev => new Map(prev).set(data.id, { ...data, isActive: true, unread: 1, messages: data.messages || [] }));
      if(data.messages.length > 0) {
        const lastMsg = data.messages[data.messages.length - 1];
        setLatestMessages(prev => new Map(prev).set(data.id, { text: lastMsg.text, timestamp: lastMsg.timestamp, metadata: lastMsg.metadata }));
      }
    });

    const conversationChannels = new Map<string, any>();
    
    const subscribeToConversation = (convId: string) => {
        if (conversationChannels.has(convId)) return;
        const channelName = `private-conversation-${convId}`;
        const channel = pusher.subscribe(channelName);
        channel.bind('new-message', (msg: Message) => {
          const isSelected = selectedConversationId === msg.conversationId;
          
          setConversations(prev => {
            const newConvos = new Map(prev);
            const convo = newConvos.get(msg.conversationId);
            if (convo) {
              const newMessages = [...convo.messages, msg];
              const unread = isSelected || msg.sender === 'agent' ? convo.unread : (convo.unread || 0) + 1;
              newConvos.set(msg.conversationId, { ...convo, messages: newMessages, unread, updatedAt: new Date().toISOString() });
            }
            return newConvos;
          });
          setLatestMessages(prev => new Map(prev).set(msg.conversationId, { text: msg.text, timestamp: msg.timestamp, metadata: msg.metadata }));
        });
        conversationChannels.set(convId, channel);
    }
    
    conversations.forEach((_, id) => subscribeToConversation(id));

    return () => {
        pusher.disconnect();
    }
  }, [session?.userId, conversations, selectedConversationId]);


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
      // Revert optimistic update on failure
      setConversations(prev => {
        const newConvos = new Map(prev);
        const convo = newConvos.get(selectedConversationId);
        if (convo) {
          newConvos.set(selectedConversationId, { ...convo, messages: convo.messages.filter(m => m.id !== optimisticMessage.id) });
        }
        return newConvos;
      });
    }
  };

  const handleSendMessage = () => {
    sendMessageToServer(inputValue);
  };
  
  const onFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedConversationId) return;

    setIsUploading(true);

    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Image upload failed');
      }

      const { imageUrl } = await response.json();
      await sendMessageToServer(null, imageUrl);

    } catch (error) {
      console.error("Failed to upload and send image:", error);
      // Optionally show an error message to the user
    } finally {
      setIsUploading(false);
       // Reset file input
      if(fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleQuickReplySelect = (content: string) => {
    setInputValue(prev => prev + content);
  }

  const handleImageUploadClick = () => {
    fileInputRef.current?.click();
  };

  const conversationArray = Array.from(conversations.values()).sort((a, b) => {
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  return (
    <div className="h-[calc(100vh-60px-3rem)] grid md:grid-cols-[300px_1fr] lg:grid-cols-[350px_1fr]">
      <div className="border-r bg-card flex flex-col">
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
                    <h3 className="font-semibold truncate">{convo.name}</h3>
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
       <div className="flex flex-col h-full bg-background">
        {selectedConversation ? (
          <>
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h3 className="text-lg font-semibold font-headline flex items-center gap-2">
                  {selectedConversation.name}
                  {selectedConversation.isActive ? 
                    <span className="text-xs text-green-600 flex items-center gap-1"><CircleDot className="h-3 w-3 fill-green-500 text-green-600" /> 在线</span> : 
                    <span className="text-xs text-muted-foreground">已离线</span>
                  }
                </h3>
              </div>
              <Button variant="outline" size="icon">
                <Archive className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {selectedConversation.messages.map((msg) => (
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
              ))}
              <div ref={messagesEndRef} />
            </div>
            <div className="p-4 border-t bg-card">
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
                            <Button variant="ghost" size="icon" disabled={!selectedConversation.isActive}><Smile className="h-5 w-5 text-muted-foreground" /></Button>
                            <input type="file" ref={fileInputRef} onChange={onFileSelect} className="hidden" accept="image/*" />
                            <Button variant="ghost" size="icon" disabled={!selectedConversation.isActive || isUploading} onClick={handleImageUploadClick}>
                               {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImageIcon className="h-5 w-5 text-muted-foreground" />}
                            </Button>
                            <Button variant="ghost" size="icon" disabled={!selectedConversation.isActive}><Paperclip className="h-5 w-5 text-muted-foreground" /></Button>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="ghost" size="icon" disabled={!selectedConversation.isActive}>
                                        <Zap className="h-5 w-5 text-muted-foreground" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-80 p-0">
                                    <Command>
                                        <CommandInput placeholder="搜索快捷回复..." />
                                        <CommandList>
                                            <CommandEmpty>没有找到快捷回复。</CommandEmpty>
                                            <CommandGroup>
                                                {quickReplies.map((reply) => (
                                                <CommandItem
                                                    key={reply.id}
                                                    onSelect={() => {
                                                        handleQuickReplySelect(reply.content)
                                                        // Note: Popover might need manual closing depending on library version
                                                    }}
                                                    className="cursor-pointer"
                                                >
                                                    <span className="truncate">{reply.content}</span>
                                                </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
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
