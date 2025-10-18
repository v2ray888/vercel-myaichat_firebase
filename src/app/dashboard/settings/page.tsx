
"use client"

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Upload, Loader2, Bot, MessageCircle, User } from "lucide-react"
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

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

export default function SettingsPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("appearance");

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

  const { reset, control, handleSubmit, watch } = form;
  const watchedValues = watch();

  useEffect(() => {
    async function fetchSettings() {
      setIsLoading(true);
      try {
        const response = await fetch('/api/settings');
        if (!response.ok) throw new Error("Failed to fetch settings");
        const data = await response.json();
        reset(data); // Populate form with fetched data
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
    fetchSettings();
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
      reset(savedData); // Reset form with data from server to ensure consistency

      toast({
        title: "保存成功",
        description: "您的设置已更新。",
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold font-headline">设置</h1>
        <Button type="submit" disabled={isSaving}>
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          保存更改
        </Button>
      </div>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="appearance">小部件外观</TabsTrigger>
          <TabsTrigger value="behavior">聊天行为</TabsTrigger>
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
                                <div className="relative">
                                    <Input id="primary-color" {...field} className="pl-10" />
                                    <div className="absolute left-2 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full border" style={{ backgroundColor: watchedValues.primaryColor }}></div>
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
                                <div className="relative">
                                    <Input id="background-color" {...field} className="pl-10" />
                                    <div className="absolute left-2 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full border" style={{ backgroundColor: watchedValues.backgroundColor }}></div>
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
  )
}
