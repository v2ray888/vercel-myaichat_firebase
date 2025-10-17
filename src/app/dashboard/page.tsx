import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowUpRight, MessageSquare, Users, Settings } from "lucide-react"

export default function DashboardPage() {
  const stats = [
    { title: "今日对话", value: "128", change: "+12.5%", icon: <MessageSquare className="h-5 w-5 text-muted-foreground" /> },
    { title: "访客数量", value: "1,204", change: "+8.2%", icon: <Users className="h-5 w-5 text-muted-foreground" /> },
    { title: "满意度", value: "95%", change: "+1.8%", icon: <Users className="h-5 w-5 text-muted-foreground" /> },
    { title: "平均响应时间", value: "32s", change: "-5.1%", icon: <MessageSquare className="h-5 w-5 text-muted-foreground" /> },
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
            {stats.map((stat, index) => (
            <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                {stat.icon}
                </CardHeader>
                <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.change} vs 上月</p>
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
                                <div className="p-2 bg-primary/10 rounded-md"><Settings className="h-5 w-5 text-primary"/></div>
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
                        {[
                            { name: "李女士", message: "你好，我想咨询一下关于最新的优惠活动..." },
                            { name: "张先生", message: "这个产品怎么使用？" },
                            { name: "王小姐", message: "我需要技术支持。" },
                        ].map((conv, index) => (
                            <div key={index} className="flex items-start gap-3">
                                <Avatar className="h-9 w-9">
                                    <AvatarImage src={`https://picsum.photos/seed/conv${index}/40/40`} />
                                    <AvatarFallback>{conv.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-semibold text-sm">{conv.name}</p>
                                    <p className="text-sm text-muted-foreground truncate">{conv.message}</p>
                                </div>
                            </div>
                        ))}
                   </div>
                   <Button variant="outline" className="w-full mt-4">查看所有对话</Button>
                </CardContent>
            </Card>
        </div>
    </div>
  )
}
