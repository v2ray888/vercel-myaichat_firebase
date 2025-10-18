"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MoreHorizontal, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format, formatDistanceToNow } from "date-fns";
import { zhCN } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";


type User = {
  id: string;
  name: string | null;
  email: string;
  createdAt: string;
};

const userFormSchema = z.object({
  id: z.string(),
  name: z.string().min(2, { message: "姓名至少需要2个字符" }),
  email: z.string().email({ message: "请输入有效的邮箱地址" }),
  password: z.string().min(6, "新密码至少需要6个字符").optional().or(z.literal('')),
});

type UserFormValues = z.infer<typeof userFormSchema>;

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const { toast } = useToast();

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
  });

  useEffect(() => {
    async function fetchUsers() {
      setIsLoading(true);
      try {
        const response = await fetch("/api/users");
        if (!response.ok) {
          throw new Error("未能加载用户列表");
        }
        const data = await response.json();
        setUsers(data);
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "加载失败",
          description: error.message,
        });
      } finally {
        setIsLoading(false);
      }
    }
    fetchUsers();
  }, [toast]);

  const handleEditClick = (user: User) => {
    setEditingUser(user);
    form.reset({
      id: user.id,
      name: user.name || '',
      email: user.email,
      password: '',
    });
    setIsModalOpen(true);
  };

  const onSubmit = async (data: UserFormValues) => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        if(result.error?.email) {
            form.setError("email", { message: result.error.email[0]});
        }
        throw new Error(result.error || '更新失败');
      }

      setUsers(users.map(u => u.id === result.id ? { ...u, ...result } : u));
      toast({
        title: "更新成功",
        description: "用户信息已更新。",
      });
      setIsModalOpen(false);

    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "更新失败",
            description: error.message || '无法保存您的更改，请稍后重试。'
        });
    } finally {
        setIsSaving(false);
    }
  };


  const TableSkeleton = () => (
    <div className="space-y-2">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
    </div>
  );

  return (
    <>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold font-headline">用户管理</h1>
        <Card>
          <CardHeader>
            <CardTitle>所有用户</CardTitle>
            <CardDescription>
              管理您应用中的所有用户。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>用户</TableHead>
                  <TableHead>角色</TableHead>
                  <TableHead className="hidden md:table-cell">注册时间</TableHead>
                  <TableHead>
                    <span className="sr-only">操作</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4}>
                      <TableSkeleton />
                    </TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                   <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center">
                          暂无用户
                      </TableCell>
                   </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                          <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9">
                                  <AvatarImage src={`https://picsum.photos/seed/${user.id}/40/40`} alt={user.name || '用户'} />
                                  <AvatarFallback>{(user.name || 'U').charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div className="grid gap-0.5">
                                  <p className="font-semibold text-foreground">{user.name || '未命名用户'}</p>
                                  <p className="text-xs text-muted-foreground">{user.email}</p>
                              </div>
                          </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">成员</Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell" title={format(new Date(user.createdAt), 'yyyy-MM-dd HH:mm:ss')}>
                        {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true, locale: zhCN })}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button aria-haspopup="true" size="icon" variant="ghost">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">切换菜单</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>操作</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleEditClick(user)}>编辑</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">
                              删除
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
           <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <DialogHeader>
                <DialogTitle>编辑用户</DialogTitle>
                <DialogDescription>
                  修改用户信息。点击“保存”以应用更改。
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                 <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="grid grid-cols-4 items-center gap-4">
                      <FormLabel className="text-right">姓名</FormLabel>
                       <div className="col-span-3">
                           <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage className="mt-1" />
                       </div>
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="grid grid-cols-4 items-center gap-4">
                      <FormLabel className="text-right">邮箱</FormLabel>
                      <div className="col-span-3">
                        <FormControl>
                          <Input type="email" {...field} />
                        </FormControl>
                        <FormMessage className="mt-1" />
                      </div>
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem className="grid grid-cols-4 items-center gap-4">
                      <FormLabel className="text-right">新密码</FormLabel>
                       <div className="col-span-3">
                          <FormControl>
                            <Input type="password" placeholder="留空则不修改" {...field} />
                          </FormControl>
                          <FormMessage className="mt-1" />
                       </div>
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="secondary">取消</Button>
                </DialogClose>
                <Button type="submit" disabled={isSaving}>
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  保存更改
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
