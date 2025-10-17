
"use client"

import { useState, useEffect, useRef } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { Archive, Image as ImageIcon, Paperclip, Search, Send, Smile, User, CircleDot, MessageSquare } from "lucide-react"
import { PlaceHolderImages } from "@/lib/placeholder-images"
import { Card, CardContent } from "@/components/ui/card"
import Pusher from 'pusher-js';

type Message = {
  id: string;
  text: string;
  sender: 'agent' | 'customer' | 'user'; // user is for local optimistic updates
  timestamp: string;
  conversationId: string;
};

type Conversation = {
  id: string;
  name: string;
  messages: Message[];
  unread?: number;
  isActive?: boolean;
};

// Ensure this is initialized only once
const pusherClient = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    authEndpoint: '/api/pusher-auth',
    auth: {
        headers: { 'Content-Type': 'application/json' },
    }
});

export default function WorkbenchPage() {
  const [conversations, setConversations] = useState<Map<string, Conversation>>(new Map());
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const userAvatar = PlaceHolderImages.find(p => p.id === 'user-avatar')?.imageUrl;

  const fetchAllConversations = async () => {
    try {
      // In a real app, you'd fetch this from an API endpoint that gets all conversations.
      // For now, we rely on Pusher for new conversations.
      // You could implement an endpoint that lists keys from Vercel KV `kv.keys('conversation:*')`
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
    }
  };

  useEffect(() => {
    fetchAllConversations();

    const agentChannel = pusherClient.subscribe('agent-dashboard');

    agentChannel.bind('new-conversation', (newConv: Conversation) => {
      setConversations(prev => {
        const newConvos = new Map(prev);
        if (!newConvos.has(newConv.id)) {
          newConvos.set(newConv.id, { ...newConv, isActive: true, unread: 1 });
        }
        return newConvos;
      });
    });

    // We need to subscribe to all channels this agent is part of.
    // In a real app, you would fetch the list of conversations an agent is assigned to.
    // For this demo, we will subscribe as new conversations come in.
    
    return () => {
        pusherClient.unsubscribe('agent-dashboard');
        // Unsubscribe from all conversation channels
        conversations.forEach(convo => {
            pusherClient.unsubscribe(`private-conversation-${convo.id}`);
        });
    }
  }, []);

  useEffect(() => {
     // Subscribe to channels for existing and new conversations
    conversations.forEach(convo => {
        const channelName = `private-conversation-${convo.id}`;
        // Prevent subscribing multiple times
        if (pusherClient.channel(channelName)) return;

        const channel = pusherClient.subscribe(channelName);
        channel.bind('new-message', (msg: Message) => {
            setConversations(prev => {
                const newConvos = new Map(prev);
                const existingConvo = newConvos.get(msg.conversationId);
                if (existingConvo) {
                    if (!existingConvo.messages.some(m => m.id === msg.id)) {
                       const unread = (msg.conversationId !== selectedConversationId && msg.sender === 'customer') ? (existingConvo.unread || 0) + 1 : existingConvo.unread;
                       newConvos.set(msg.conversationId, {
                           ...existingConvo,
                           messages: [...existingConvo.messages, msg],
                           unread,
                       });
                    }
                }
                return newConvos;
            });
        });
    });
  }, [conversations, selectedConversationId]);


  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversations, selectedConversationId]);


  const handleSelectConversation = async (id: string) => {
    setSelectedConversationId(id);
    
    // Mark as read
    setConversations(prev => {
        const newConvos = new Map(prev);
        const convo = newConvos.get(id);
        if (convo) {
            newConvos.set(id, { ...convo, unread: 0 });
        }
        return newConvos;
    });

    // Fetch history if it's not already loaded
    const currentConvo = conversations.get(id);
    if (currentConvo && currentConvo.messages.length === 0) {
        try {
            const response = await fetch(`/api/stream-chat?conversationId=${id}`);
            const data: Conversation = await response.json();
            if (data && data.messages) {
                 setConversations(prev => {
                    const newConvos = new Map(prev);
                    newConvos.set(id, { ...data, unread: 0 });
                    return newConvos;
                 });
            }
        } catch (error) {
            console.error("Failed to fetch conversation history:", error);
        }
    }
  }

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !selectedConversationId) return;

    const optimisticMessage: Message = {
      id: crypto.randomUUID(),
      text: inputValue,
      sender: 'agent',
      timestamp: new Date().toISOString(),
      conversationId: selectedConversationId,
    };

    // Optimistic update
    setConversations(prev => {
      const newConvos = new Map(prev);
      const convo = newConvos.get(selectedConversationId);
      if (convo) {
        newConvos.set(selectedConversationId, {
          ...convo,
          messages: [...convo.messages, optimisticMessage]
        });
      }
      return newConvos;
    });
    setInputValue('');


    try {
      await fetch('/api/stream-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: inputValue,
          conversationId: selectedConversationId,
          role: 'agent',
        }),
      });
    } catch (error) {
      console.error("Failed to send message:", error);
      // Optionally show an error to the agent and revert optimistic update
    }
  };

  const selectedConversation = selectedConversationId ? conversations.get(selectedConversationId) : null;
  const conversationArray = Array.from(conversations.values()).sort((a, b) => {
    const lastMsgA = a.messages[a.messages.length - 1]?.timestamp;
    const lastMsgB = b.messages[b.messages.length - 1]?.timestamp;
    if (!lastMsgA) return 1;
    if (!lastMsgB) return -1;
    return new Date(lastMsgB).getTime() - new Date(lastMsgA).getTime();
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
          {conversationArray.length === 0 && <p className="p-4 text-sm text-muted-foreground">暂无活跃对话</p>}
          {conversationArray.map((convo) => (
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
                  {convo.messages.length > 0 && <span className="text-xs text-muted-foreground">{new Date(convo.messages[convo.messages.length-1].timestamp).toLocaleTimeString()}</span>}
                </div>
                <div className="flex justify-between items-start">
                  <p className="text-sm text-muted-foreground truncate">{convo.messages[convo.messages.length - 1]?.text || '...新会话...'}</p>
                  {convo.unread && convo.unread > 0 && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                      {convo.unread}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
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
                      "max-w-[70%] rounded-lg px-4 py-2",
                      msg.sender === 'agent' ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-muted text-card-foreground rounded-bl-none'
                  )}>
                    <p>{msg.text}</p>
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
                        disabled={!selectedConversation.isActive}
                    />
                    <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" disabled={!selectedConversation.isActive}><Smile className="h-5 w-5 text-muted-foreground" /></Button>
                            <Button variant="ghost" size="icon" disabled={!selectedConversation.isActive}><ImageIcon className="h-5 w-5 text-muted-foreground" /></Button>
                            <Button variant="ghost" size="icon" disabled={!selectedConversation.isActive}><Paperclip className="h-5 w-5 text-muted-foreground" /></Button>
                        </div>
                        <Button onClick={handleSendMessage} disabled={!inputValue.trim() || !selectedConversation.isActive}>
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
            <p className="text-sm">或者等待新客户发起会话。</p>
          </div>
        )}
      </div>
    </div>
  )
}
