"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Code2,
  Home,
  LogOut,
  MessageSquare,
  Settings,
} from "lucide-react"
import { useEffect, useState } from "react"

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
import { Skeleton } from "@/components/ui/skeleton"

type User = {
    name: string | null;
    email: string;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const userAvatar = PlaceHolderImages.find(p => p.id === 'user-avatar');

  useEffect(() => {
    // In a real app, you'd fetch this from the session.
    // For now we simulate it. The middleware protects the route.
    // A better approach would be to have a session provider.
    const fetchUser = async () => {
        // This is a temporary way to get user info on the client.
        // A full solution would involve a session provider context.
        const res = await fetch('/api/auth/session'); // A new endpoint to get session
        if(res.ok) {
            const data = await res.json();
            if (data.session) {
                setUser({
                    name: data.session.name,
                    email: data.session.email
                });
            } else {
                router.push('/login');
            }
        }
    }
    // Let's create a temp user object
    setUser({ name: "客服代表", email: "admin@zhiliaotong.com" });
  },[router])

  const navItems = [
    { href: "/dashboard", icon: <Home />, label: "仪表盘" },
    { href: "/dashboard/workbench", icon: <MessageSquare />, label: "工作台" },
    { href: "/dashboard/code", icon: <Code2 />, label: "代码嵌入" },
    { href: "/dashboard/settings", icon: <Settings />, label: "设置" },
  ]

  const handleLogout = async () => {
      setIsLoggingOut(true);
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
  }

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
                        <AvatarFallback>{user?.name?.charAt(0) || '用户'}</AvatarFallback>
                    </Avatar>
                    <div className="text-sidebar-foreground group-data-[collapsible=icon]:hidden overflow-hidden">
                       {user ? (
                           <>
                             <p className="text-sm font-medium truncate">{user.name}</p>
                             <p className="text-xs text-sidebar-foreground/70 truncate">{user.email}</p>
                           </>
                       ) : (
                           <div className="space-y-1">
                             <Skeleton className="h-4 w-20 bg-sidebar-accent" />
                             <Skeleton className="h-3 w-32 bg-sidebar-accent" />
                           </div>
                       )}
                    </div>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="start">
                <DropdownMenuLabel>我的账户</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>个人资料</DropdownMenuItem>
                <DropdownMenuItem>账单</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} disabled={isLoggingOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>退出登录</span>
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
                  <AvatarFallback>{user?.name?.charAt(0) || '用户'}</AvatarFallback>
                </Avatar>
                <span className="sr-only">Toggle user menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>我的账户</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild><Link href="/dashboard/settings">设置</Link></DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} disabled={isLoggingOut}>
                 <LogOut className="mr-2 h-4 w-4" />
                <span>退出登录</span>
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
