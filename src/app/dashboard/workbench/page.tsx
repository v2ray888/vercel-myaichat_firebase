"use client"

import { useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { Archive, Image as ImageIcon, Paperclip, Search, Send, Smile, User } from "lucide-react"
import { PlaceHolderImages } from "@/lib/placeholder-images"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

const conversations = [
  { id: 1, name: "王美丽", message: "你好，我想咨询一下最新的优惠活动。", time: "2m ago", unread: 2, avatar: PlaceHolderImages.find(p => p.id === 'customer-1')?.imageUrl },
  { id: 2, name: "张伟", message: "这个产品怎么使用？我遇到了一些问题。", time: "1h ago", unread: 0, avatar: PlaceHolderImages.find(p => p.id === 'customer-2')?.imageUrl },
  { id: 3, name: "李小雅", message: "请问你们支持开发票吗？", time: "3h ago", unread: 0, avatar: PlaceHolderImages.find(p => p.id === 'customer-3')?.imageUrl },
]

const messages = [
    { sender: "customer", text: "你好，我想咨询一下最新的优惠活动。" },
    { sender: "agent", text: "您好！很高兴为您服务。我们最近有一个针对新用户的 9 折优惠，请问您感兴趣吗？" },
    { sender: "customer", text: "听起来不错！请问有什么限制吗？" },
]

export default function WorkbenchPage() {
  const [selectedConversation, setSelectedConversation] = useState(conversations[0])

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
          {conversations.map((convo) => (
            <div
              key={convo.id}
              className={cn(
                "flex items-center gap-3 p-3 cursor-pointer border-l-4",
                selectedConversation.id === convo.id
                  ? "bg-muted border-primary"
                  : "border-transparent hover:bg-muted/50"
              )}
              onClick={() => setSelectedConversation(convo)}
            >
              <Avatar className="h-10 w-10">
                <AvatarImage src={convo.avatar} alt={convo.name} />
                <AvatarFallback>{convo.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 overflow-hidden">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold truncate">{convo.name}</h3>
                  <span className="text-xs text-muted-foreground">{convo.time}</span>
                </div>
                <div className="flex justify-between items-start">
                  <p className="text-sm text-muted-foreground truncate">{convo.message}</p>
                  {convo.unread > 0 && (
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
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h3 className="text-lg font-semibold font-headline">{selectedConversation.name}</h3>
            <span className="text-sm text-muted-foreground">在线</span>
          </div>
          <Button variant="outline" size="icon">
            <Archive className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((msg, index) => (
            <div key={index} className={cn("flex items-end gap-2", msg.sender === 'agent' ? 'justify-end' : 'justify-start')}>
              {msg.sender === 'customer' && (
                <Avatar className="h-8 w-8">
                  <AvatarImage src={selectedConversation.avatar} alt={selectedConversation.name} />
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
                  <AvatarImage src={PlaceHolderImages.find(p => p.id === 'user-avatar')?.imageUrl} alt="Agent" />
                  <AvatarFallback><User size={18} /></AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
        </div>
        <div className="p-4 border-t bg-card">
          <Card>
            <CardContent className="p-2">
                <Textarea
                    placeholder="输入您的回复..."
                    className="w-full border-0 focus-visible:ring-0 resize-none bg-transparent"
                />
                <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon"><Smile className="h-5 w-5 text-muted-foreground" /></Button>
                        <Button variant="ghost" size="icon"><ImageIcon className="h-5 w-5 text-muted-foreground" /></Button>
                        <Button variant="ghost" size="icon"><Paperclip className="h-5 w-5 text-muted-foreground" /></Button>
                    </div>
                    <Button>
                        发送回复 <Send className="ml-2 h-4 w-4" />
                    </Button>
                </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
