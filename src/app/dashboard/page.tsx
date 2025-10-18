
"use client"

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowUpRight, MessageSquare, Users, Activity, MessageSquarePlus } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton";
import Pusher from 'pusher-js';
import { useSession } from "@/hooks/use-session";

type Conversation = {
  id: string;
  name: string | null;
  updatedAt: string;
}

type Stats = {
  totalConversations: number;
  activeConversations: number;
  todayConversations: number;
};

export default function DashboardPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [stats, setStats] = useState<Stats>({ totalConversations: 0, activeConversations: 0, todayConversations: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const { session, isLoading: isSessionLoading } = useSession();


  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/conversations');
      if (!res.ok) throw new Error("Failed to fetch data");
      const data = await res.json();
      setConversations(data.conversations || []);
      setStats(data.stats || { totalConversations: 0, activeConversations: 0, todayConversations: 0 });
    } catch (error) {
      console.error("Dashboard fetch error:", error);
      // Optionally set an error state and show a toast
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!session?.userId || isSessionLoading) return;

    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
        authEndpoint: '/api/pusher-auth',
    });
    
    const agentChannelName = `private-agent-${session.userId}`;
    const agentChannel = pusher.subscribe(agentChannelName);
    
    agentChannel.bind('dashboard-update', () => {
      fetchData(); // Refetch data when an update event is received
    });

    return () => {
        pusher.unsubscribe(agentChannelName);
        pusher.disconnect();
    }
  }, [session?.userId, isSessionLoading, fetchData]);


  const statsCards = [
    { title: "总对话数", value: isLoading ? <Skeleton className="h-8 w-16" /> : stats.totalConversations.toString(), icon: <MessageSquare className="h-5 w-5 text-muted-foreground" /> },
    { title: "今日新增", value: isLoading ? <Skeleton className="h-8 w-12" /> : stats.todayConversations.toString(), icon: <MessageSquarePlus className="h-5 w-5 text-muted-foreground" /> },
    { title: "当前活跃", value: isLoading ? <Skeleton className="h-8 w-10" /> : stats.activeConversations.toString(), icon: <Activity className="h-5 w-5 text-muted-foreground" /> },
    { title: "满意度", value: isLoading ? <Skeleton className="h-8 w-12" /> : "95%", icon: <Users className="h-5 w-5 text-muted-foreground" /> },
  ]
  return (
    <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h1 className="text-3xl font-bold font-headline">仪表盘</h1>
                <p className="text-muted-foreground">欢迎回来，这是您的业务概览。</p>
            </div>
            <Button asChild>
                <Link href="/dashboard/workbench">
                    进入工作台
                </Link>
            </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {statsCards.map((stat, index) => (
            <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                {stat.icon}
                </CardHeader>
                <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                </CardContent>
            </Card>
            ))}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle>快速开始</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-muted-foreground">准备好开始了吗？按照以下步骤配置您的客服系统。</p>
                    <div className="flex flex-col space-y-3">
                        <Link href="/dashboard/settings" className="flex items-center justify-between p-3 rounded-md hover:bg-muted transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-md"><Users className="h-5 w-5 text-primary"/></div>
                                <div>
                                    <p className="font-semibold">配置小部件</p>
                                    <p className="text-sm text-muted-foreground">自定义您的聊天窗口外观和行为</p>
                                </div>
                            </div>
                            <ArrowUpRight className="h-5 w-5 text-muted-foreground"/>
                        </Link>
                        <Link href="/dashboard/code" className="flex items-center justify-between p-3 rounded-md hover:bg-muted transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-md"><MessageSquare className="h-5 w-5 text-primary"/></div>
                                <div>
                                    <p className="font-semibold">嵌入您的网站</p>
                                    <p className="text-sm text-muted-foreground">获取代码并将其安装到您的网站</p>
                                </div>
                            </div>
                            <ArrowUpRight className="h-5 w-5 text-muted-foreground"/>
                        </Link>
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>最新对话</CardTitle>
                </CardHeader>
                <CardContent>
                   <div className="space-y-4">
                        {isLoading ? (
                            <>
                                <div className="flex items-start gap-3"><Skeleton className="h-9 w-9 rounded-full" /><div className="space-y-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-4 w-48" /></div></div>
                                <div className="flex items-start gap-3"><Skeleton className="h-9 w-9 rounded-full" /><div className="space-y-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-4 w-48" /></div></div>
                                <div className="flex items-start gap-3"><Skeleton className="h-9 w-9 rounded-full" /><div className="space-y-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-4 w-48" /></div></div>
                            </>
                        ) : conversations.length > 0 ? (
                           conversations.slice(0, 3).map((conv) => (
                                <div key={conv.id} className="flex items-start gap-3">
                                    <Avatar className="h-9 w-9">
                                        <AvatarImage src={`https://picsum.photos/seed/${conv.id}/40/40`} />
                                        <AvatarFallback>{conv.name?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-semibold text-sm">{conv.name}</p>
                                        <p className="text-sm text-muted-foreground truncate">
                                            对话更新于 {new Date(conv.updatedAt).toLocaleTimeString()}
                                        </p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center text-muted-foreground py-6">
                                <p>暂无对话</p>
                            </div>
                        )}
                   </div>
                   <Button variant="outline" className="w-full mt-4" asChild>
                       <Link href="/dashboard/workbench">查看所有对话</Link>
                   </Button>
                </CardContent>
            </Card>
        </div>
    </div>
  )
}
