"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Code2,
  Home,
  MessageSquare,
  Settings,
  Bot,
} from "lucide-react"

import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Icons } from "@/components/icons"
import { PlaceHolderImages } from "@/lib/placeholder-images"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname();
  const userAvatar = PlaceHolderImages.find(p => p.id === 'user-avatar');

  const navItems = [
    { href: "/dashboard", icon: <Home />, label: "仪表盘" },
    { href: "/dashboard/workbench", icon: <MessageSquare />, label: "工作台" },
    { href: "/dashboard/code", icon: <Code2 />, label: "代码嵌入" },
    { href: "/dashboard/stream-test", icon: <Bot />, label: "流式聊天测试" },
    { href: "/dashboard/settings", icon: <Settings />, label: "设置" },
  ]

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <div className="flex items-center gap-2" data-testid="sidebar-header">
            <Icons.logo className="h-7 w-7 text-sidebar-foreground" />
            <span className="text-lg font-semibold font-headline text-sidebar-foreground group-data-[collapsible=icon]:hidden">
              智聊通
            </span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {navItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton asChild isActive={pathname === item.href} tooltip={item.label}>
                  <Link href={item.href}>
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
           <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="justify-start w-full gap-2 p-2 h-auto text-left">
                     <Avatar className="h-8 w-8">
                        {userAvatar && <AvatarImage src={userAvatar.imageUrl} alt="User" />}
                        <AvatarFallback>用户</AvatarFallback>
                    </Avatar>
                    <div className="text-sidebar-foreground group-data-[collapsible=icon]:hidden">
                        <p className="text-sm font-medium">客服代表</p>
                        <p className="text-xs text-sidebar-foreground/70">admin@zhiliaotong.com</p>
                    </div>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="start">
                <DropdownMenuLabel>我的账户</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>个人资料</DropdownMenuItem>
                <DropdownMenuItem>账单</DropdownMenuItem>
                <DropdownMenuItem>团队</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    <Link href="/">退出登录</Link>
                </DropdownMenuItem>
            </DropdownMenuContent>
           </DropdownMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 items-center gap-4 border-b bg-card px-4 sticky top-0 z-40 lg:h-[60px] lg:px-6">
          <SidebarTrigger className="md:hidden" />
          <div className="w-full flex-1" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon" className="rounded-full">
                <Avatar className="h-8 w-8">
                   {userAvatar && <AvatarImage src={userAvatar.imageUrl} alt="User" />}
                  <AvatarFallback>用户</AvatarFallback>
                </Avatar>
                <span className="sr-only">Toggle user menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>我的账户</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>个人资料</DropdownMenuItem>
              <DropdownMenuItem asChild><Link href="/dashboard/settings">设置</Link></DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/">退出登录</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="flex-1 p-4 sm:p-6 bg-background">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
