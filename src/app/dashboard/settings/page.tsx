
"use client"

import { useEffect, useState } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Upload, Loader2, Bot, MessageCircle, User, PlusCircle, Trash2, Edit, Save, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

const settingsSchema = z.object({
  welcomeMessage: z.string().min(1, "欢迎消息不能为空"),
  autoOpenWidget: z.boolean(),
  allowCustomerImageUpload: z.boolean(),
  allowAgentImageUpload: z.boolean(),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "无效的颜色代码"),
  backgroundColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "无效的颜色代码"),
  workspaceName: z.string().min(1, "工作区名称不能为空"),
  workspaceDomain: z.string().optional(),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

type QuickReply = {
  id: string;
  title: string;
  content: string;
};

const quickReplyFormSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, '标题不能为空'),
  content: z.string().min(1, '内容不能为空'),
});
type QuickReplyFormValues = z.infer<typeof quickReplyFormSchema>;

export default function SettingsPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("appearance");

  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [isRepliesLoading, setIsRepliesLoading] = useState(true);
  const [isReplyModalOpen, setIsReplyModalOpen] = useState(false);
  const [editingReply, setEditingReply] = useState<QuickReply | null>(null);

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      welcomeMessage: "您好！我是智能客服，很高兴为您服务。",
      autoOpenWidget: true,
      allowCustomerImageUpload: true,
      allowAgentImageUpload: true,
      primaryColor: "#3F51B5",
      backgroundColor: "#F0F2F5",
      workspaceName: "",
    }
  });
  
  const quickReplyForm = useForm<QuickReplyFormValues>({
    resolver: zodResolver(quickReplyFormSchema),
    defaultValues: { title: '', content: '' }
  });

  const { reset, control, handleSubmit, watch } = form;
  const watchedValues = watch();

  useEffect(() => {
    async function fetchSettings() {
      setIsLoading(true);
      try {
        const response = await fetch('/api/settings');
        if (!response.ok) throw new Error("Failed to fetch settings");
        const data = await response.json();
        reset(data);
      } catch (error) {
        console.error(error);
        toast({
          variant: "destructive",
          title: "加载失败",
          description: "无法加载您的设置，请刷新页面重试。"
        });
      } finally {
        setIsLoading(false);
      }
    }

    async function fetchQuickReplies() {
      setIsRepliesLoading(true);
      try {
        const response = await fetch('/api/quick-replies');
        if (!response.ok) throw new Error("Failed to fetch quick replies");
        const data = await response.json();
        setQuickReplies(data);
      } catch (error) {
        console.error(error);
        toast({
          variant: "destructive",
          title: "加载失败",
          description: "无法加载快捷回复列表。"
        });
      } finally {
        setIsRepliesLoading(false);
      }
    }

    fetchSettings();
    fetchQuickReplies();
  }, [reset, toast]);

  const onSubmit = async (data: SettingsFormValues) => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('保存失败');
      
      const savedData = await response.json();
      reset(savedData);

      toast({
        title: "保存成功",
        description: "您的通用设置已更新。",
      });

    } catch (error) {
      toast({
        variant: "destructive",
        title: "保存失败",
        description: "无法保存您的设置，请稍后重试。",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuickReplySubmit = async (data: QuickReplyFormValues) => {
    setIsSaving(true);
    const isEditing = !!data.id;
    const url = '/api/quick-replies';
    const method = isEditing ? 'PUT' : 'POST';
    
    let payload: any = { ...data };
    if (!isEditing) {
      delete payload.id;
    }

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(isEditing ? '更新失败' : '创建失败');
      }

      const savedReply: QuickReply = await response.json();
      if (isEditing) {
        setQuickReplies(quickReplies.map(r => r.id === savedReply.id ? savedReply : r));
      } else {
        setQuickReplies([savedReply, ...quickReplies]);
      }

      toast({
        title: "保存成功",
        description: `快捷回复 "${savedReply.title}" 已保存。`,
      });
      closeReplyModal();

    } catch (error) {
      toast({
        variant: "destructive",
        title: "保存失败",
        description: "操作失败，请稍后重试。",
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleDeleteReply = async (id: string) => {
    try {
      const response = await fetch(`/api/quick-replies?id=${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('删除失败');

      setQuickReplies(quickReplies.filter(r => r.id !== id));
      toast({
        title: "删除成功",
        description: "快捷回复已删除。",
      });
    } catch (error) {
       toast({
        variant: "destructive",
        title: "删除失败",
        description: "操作失败，请稍后重试。",
      });
    }
  };

  const openReplyModal = (reply: QuickReply | null = null) => {
    setEditingReply(reply);
    quickReplyForm.reset(reply || { title: '', content: '' });
    setIsReplyModalOpen(true);
  };
  
  const closeReplyModal = () => {
    setIsReplyModalOpen(false);
    setEditingReply(null);
  };


  const PageSkeleton = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-10 w-24" />
      </div>
      <Skeleton className="h-10 w-full max-w-md" />
      <Card>
        <CardHeader>
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-80 mt-2" />
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-24 w-24" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  if (isLoading) {
    return <PageSkeleton />;
  }

  return (
    <>
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold font-headline">设置</h1>
        <Button type="submit" disabled={isSaving}>
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          保存更改
        </Button>
      </div>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 max-w-lg">
          <TabsTrigger value="appearance">小部件外观</TabsTrigger>
          <TabsTrigger value="behavior">聊天行为</TabsTrigger>
          <TabsTrigger value="quick-replies">快捷回复</TabsTrigger>
          <TabsTrigger value="general">通用设置</TabsTrigger>
        </TabsList>

        <TabsContent value="appearance" className="mt-6">
           <Card>
            <CardHeader>
              <CardTitle>小部件外观</CardTitle>
              <CardDescription>自定义您的聊天小部件，以匹配您的品牌风格。修改将在此处实时预览。</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid lg:grid-cols-2 gap-12 items-start">
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <Label>品牌标识</Label>
                            <div className="flex items-center gap-4">
                                <div className="w-24 h-24 rounded-md border border-dashed flex items-center justify-center bg-muted">
                                    <Upload className="h-6 w-6 text-muted-foreground" />
                                </div>
                                <div>
                                    <Button type="button" variant="outline">上传图片</Button>
                                    <p className="text-xs text-muted-foreground mt-2">推荐尺寸: 128x128px, PNG, JPG, GIF</p>
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Controller
                            name="primaryColor"
                            control={control}
                            render={({ field }) => (
                                <div className="space-y-2">
                                <Label htmlFor="primary-color">主颜色</Label>
                                <div className="flex items-center gap-2">
                                    <input type="color" {...field} className="h-10 w-12 p-1 bg-card border rounded-md cursor-pointer"/>
                                    <Input id="primary-color" {...field}  />
                                </div>
                                {form.formState.errors.primaryColor && <p className="text-sm text-destructive">{form.formState.errors.primaryColor.message}</p>}
                                </div>
                            )}
                            />
                            <Controller
                            name="backgroundColor"
                            control={control}
                            render={({ field }) => (
                                <div className="space-y-2">
                                <Label htmlFor="background-color">背景颜色</Label>
                                 <div className="flex items-center gap-2">
                                    <input type="color" {...field} className="h-10 w-12 p-1 bg-card border rounded-md cursor-pointer"/>
                                    <Input id="background-color" {...field} />
                                </div>
                                {form.formState.errors.backgroundColor && <p className="text-sm text-destructive">{form.formState.errors.backgroundColor.message}</p>}
                                </div>
                            )}
                            />
                        </div>
                    </div>
                    
                    <div className="lg:mt-6">
                        <Label>实时预览</Label>
                        <div className="mt-2 relative w-full max-w-sm h-[400px] rounded-lg shadow-2xl flex flex-col overflow-hidden ring-1 ring-border" style={{ backgroundColor: watchedValues.backgroundColor }}>
                             <div className="flex-shrink-0 flex flex-row items-center justify-between p-3 text-white" style={{ backgroundColor: watchedValues.primaryColor }}>
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-9 w-9 border-2 border-primary-foreground/50 flex items-center justify-center bg-white">
                                        <Bot size={20} className="text-gray-600"/>
                                    </Avatar>
                                    <div>
                                        <p className="font-semibold text-base">{watchedValues.workspaceName || '智聊通客服'}</p>
                                        <p className="text-xs opacity-80">我们在线上</p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex-1 p-4 overflow-y-auto space-y-4">
                                <div className="flex items-end gap-2 justify-start">
                                    <Avatar className="h-8 w-8">
                                        <AvatarFallback><Bot size={18}/></AvatarFallback>
                                    </Avatar>
                                    <div className="max-w-[75%] rounded-lg px-3 py-2 text-sm bg-card text-foreground rounded-bl-none shadow-sm">
                                        <p>{watchedValues.welcomeMessage}</p>
                                    </div>
                                </div>
                                 <div className="flex items-end gap-2 justify-end">
                                     <div className="max-w-[75%] rounded-lg px-3 py-2 text-sm text-white rounded-br-none" style={{backgroundColor: watchedValues.primaryColor}}>
                                        <p>你好！</p>
                                    </div>
                                    <Avatar className="h-8 w-8">
                                        <AvatarFallback><User size={18}/></AvatarFallback>
                                    </Avatar>
                                </div>
                            </div>
                            <div className="p-2 border-t bg-card">
                                 <Input placeholder="输入您的问题..." disabled/>
                            </div>
                        </div>
                         <div className="relative max-w-sm">
                             <div className="absolute bottom-[-20px] right-[-20px] h-16 w-16 rounded-full shadow-lg flex items-center justify-center text-white" style={{ backgroundColor: watchedValues.primaryColor }}>
                                 <MessageCircle className="h-8 w-8" />
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="behavior" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>聊天行为</CardTitle>
              <CardDescription>配置聊天小部件的交互和自动化功能。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Controller
                name="welcomeMessage"
                control={control}
                render={({ field }) => (
                  <div className="space-y-2">
                    <Label htmlFor="welcome-message">欢迎消息</Label>
                    <Textarea id="welcome-message" placeholder="您好！有什么可以帮助您的吗？" {...field} />
                     {form.formState.errors.welcomeMessage && <p className="text-sm text-destructive">{form.formState.errors.welcomeMessage.message}</p>}
                  </div>
                )}
              />
              <Controller
                name="autoOpenWidget"
                control={control}
                render={({ field }) => (
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <Label htmlFor="auto-open" className="font-medium">自动打开小部件</Label>
                      <p className="text-sm text-muted-foreground">页面加载时自动展开聊天窗口。</p>
                    </div>
                    <Switch id="auto-open" checked={field.value} onCheckedChange={field.onChange} />
                  </div>
                )}
              />
              <Controller
                name="allowCustomerImageUpload"
                control={control}
                render={({ field }) => (
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <Label htmlFor="image-upload-customer" className="font-medium">允许客户上传图片</Label>
                      <p className="text-sm text-muted-foreground">允许客户在聊天中发送图片。</p>
                    </div>
                    <Switch id="image-upload-customer" checked={field.value} onCheckedChange={field.onChange} />
                  </div>
                )}
              />
              <Controller
                name="allowAgentImageUpload"
                control={control}
                render={({ field }) => (
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <Label htmlFor="image-upload-agent" className="font-medium">允许客服上传图片</Label>
                      <p className="text-sm text-muted-foreground">允许客服在工作台中发送图片。</p>
                    </div>
                    <Switch id="image-upload-agent" checked={field.value} onCheckedChange={field.onChange} />
                  </div>
                )}
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="quick-replies" className="mt-6">
            <Card>
                <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>快捷回复管理</CardTitle>
                        <CardDescription>创建和管理您在工作台中常用的回复。</CardDescription>
                    </div>
                    <Button type="button" onClick={() => openReplyModal()}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        新建回复
                    </Button>
                </div>
                </CardHeader>
                <CardContent>
                    {isRepliesLoading ? (
                        <div className="space-y-4">
                            <Skeleton className="h-16 w-full" />
                            <Skeleton className="h-16 w-full" />
                            <Skeleton className="h-16 w-full" />
                        </div>
                    ) : quickReplies.length > 0 ? (
                        <div className="space-y-3">
                            {quickReplies.map((reply) => (
                                <div key={reply.id} className="flex items-center justify-between p-4 border rounded-lg">
                                    <div className="flex-1 overflow-hidden">
                                        <p className="font-semibold truncate">{reply.title}</p>
                                        <p className="text-sm text-muted-foreground truncate">{reply.content}</p>
                                    </div>
                                    <div className="flex items-center gap-2 ml-4">
                                        <Button type="button" variant="ghost" size="icon" onClick={() => openReplyModal(reply)}>
                                            <Edit className="h-4 w-4" />
                                        </Button>

                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button type="button" variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                <AlertDialogTitle>确认删除？</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    此操作无法撤销。您确定要永久删除标题为 “{reply.title}” 的快捷回复吗？
                                                </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                <AlertDialogCancel>取消</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDeleteReply(reply.id)} className="bg-destructive hover:bg-destructive/90">删除</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>

                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-10 border-2 border-dashed rounded-lg">
                            <p className="text-muted-foreground">暂无快捷回复</p>
                            <p className="text-sm text-muted-foreground mt-2">点击“新建回复”来创建您的第一条快捷回复吧！</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="general" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>通用设置</CardTitle>
              <CardDescription>管理您的账户和工作区基本信息。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Controller
                name="workspaceName"
                control={control}
                render={({ field }) => (
                  <div className="space-y-2">
                    <Label htmlFor="workspace-name">工作区名称</Label>
                    <Input id="workspace-name" {...field} />
                     {form.formState.errors.workspaceName && <p className="text-sm text-destructive">{form.formState.errors.workspaceName.message}</p>}
                  </div>
                )}
              />
              <Controller
                name="workspaceDomain"
                control={control}
                render={({ field }) => (
                  <div className="space-y-2">
                    <Label htmlFor="workspace-domain">工作区域名</Label>
                    <Input id="workspace-domain" {...field} />
                  </div>
                )}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </form>

     <Dialog open={isReplyModalOpen} onOpenChange={setIsReplyModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={quickReplyForm.handleSubmit(handleQuickReplySubmit)}>
            <DialogHeader>
              <DialogTitle>{editingReply ? '编辑' : '新建'}快捷回复</DialogTitle>
              <DialogDescription>
                创建或修改您的快捷回复，以便在工作台中快速使用。
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <Controller
                  name="title"
                  control={quickReplyForm.control}
                  render={({ field }) => (
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="title" className="text-right">标题</Label>
                        <Input id="title" {...field} className="col-span-3" />
                        {quickReplyForm.formState.errors.title && <p className="col-start-2 col-span-3 text-sm text-destructive">{quickReplyForm.formState.errors.title.message}</p>}
                    </div>
                  )}
              />
              <Controller
                  name="content"
                  control={quickReplyForm.control}
                  render={({ field }) => (
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="content" className="text-right">内容</Label>
                        <Textarea id="content" {...field} className="col-span-3" />
                         {quickReplyForm.formState.errors.content && <p className="col-start-2 col-span-3 text-sm text-destructive">{quickReplyForm.formState.errors.content.message}</p>}
                    </div>
                  )}
              />
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="secondary">取消</Button>
              </DialogClose>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                保存
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
