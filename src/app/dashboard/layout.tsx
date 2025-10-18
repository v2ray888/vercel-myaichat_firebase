"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Code2,
  Home,
  LogOut,
  MessageSquare,
  Settings,
  Users,
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
import { useSession } from "@/hooks/use-session"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const userAvatar = PlaceHolderImages.find(p => p.id === 'user-avatar');
  const { session: user, isLoading: isSessionLoading, forceReload } = useSession();


  useEffect(() => {
    if (!isSessionLoading && !user) {
        router.push('/login');
    }
  },[user, isSessionLoading, router])
  
  useEffect(() => {
    const reloadSession = () => {
      forceReload();
    };
    window.addEventListener('storage', reloadSession);
    return () => {
      window.removeEventListener('storage', reloadSession);
    }
  }, [forceReload]);


  const navItems = [
    { href: "/dashboard", icon: <Home />, label: "仪表盘" },
    { href: "/dashboard/workbench", icon: <MessageSquare />, label: "工作台" },
    { href: "/dashboard/users", icon: <Users />, label: "用户管理" },
    { href: "/dashboard/code", icon: <Code2 />, label: "代码嵌入" },
    { href: "/dashboard/settings", icon: <Settings />, label: "设置" },
  ]

  const handleLogout = async () => {
      setIsLoggingOut(true);
      await fetch('/api/auth/logout', { method: 'POST' });
      // The middleware will handle the redirect
      router.refresh();
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
                       {isSessionLoading ? (
                           <div className="space-y-1">
                             <Skeleton className="h-4 w-20 bg-sidebar-accent" />
                             <Skeleton className="h-3 w-32 bg-sidebar-accent" />
                           </div>
                       ) : user ? (
                           <>
                             <p className="text-sm font-medium truncate">{user.name}</p>
                             <p className="text-xs text-sidebar-foreground/70 truncate">{user.email}</p>
                           </>
                       ) : (
                           <p>未登录</p>
                       )}
                    </div>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="start">
                <DropdownMenuLabel>我的账户</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild><Link href="/dashboard/settings">个人资料</Link></DropdownMenuItem>
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
