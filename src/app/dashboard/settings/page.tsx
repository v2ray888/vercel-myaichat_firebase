"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Upload } from "lucide-react"

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold font-headline">设置</h1>
        <Button>保存更改</Button>
      </div>
      <Tabs defaultValue="appearance">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="appearance">小部件外观</TabsTrigger>
          <TabsTrigger value="behavior">聊天行为</TabsTrigger>
          <TabsTrigger value="general">通用设置</TabsTrigger>
        </TabsList>

        <TabsContent value="appearance" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>小部件外观</CardTitle>
              <CardDescription>自定义您的聊天小部件，以匹配您的品牌风格。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>品牌标识</Label>
                <div className="flex items-center gap-4">
                  <div className="w-24 h-24 rounded-md border border-dashed flex items-center justify-center bg-muted">
                    <Upload className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <Button variant="outline">上传图片</Button>
                    <p className="text-xs text-muted-foreground mt-2">推荐尺寸: 128x128px, PNG, JPG, GIF</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="primary-color">主颜色</Label>
                    <div className="relative">
                        <Input id="primary-color" defaultValue="#3F51B5" className="pl-8" />
                        <div className="absolute left-2 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full" style={{backgroundColor: '#3F51B5'}}></div>
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="background-color">背景颜色</Label>
                     <div className="relative">
                        <Input id="background-color" defaultValue="#F0F2F5" className="pl-8" />
                        <div className="absolute left-2 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full border" style={{backgroundColor: '#F0F2F5'}}></div>
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
                <div className="space-y-2">
                    <Label htmlFor="welcome-message">欢迎消息</Label>
                    <Textarea id="welcome-message" placeholder="您好！有什么可以帮助您的吗？" defaultValue="您好！我是智能客服，很高兴为您服务。"/>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                        <Label htmlFor="auto-open" className="font-medium">自动打开小部件</Label>
                        <p className="text-sm text-muted-foreground">页面加载时自动展开聊天窗口。</p>
                    </div>
                    <Switch id="auto-open" defaultChecked={true} />
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                        <Label htmlFor="image-upload-customer" className="font-medium">允许客户上传图片</Label>
                        <p className="text-sm text-muted-foreground">允许客户在聊天中发送图片。</p>
                    </div>
                    <Switch id="image-upload-customer" defaultChecked={true} />
                </div>
                 <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                        <Label htmlFor="image-upload-agent" className="font-medium">允许客服上传图片</Label>
                        <p className="text-sm text-muted-foreground">允许客服在工作台中发送图片。</p>
                    </div>
                    <Switch id="image-upload-agent" defaultChecked={true} />
                </div>
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
              <div className="space-y-2">
                <Label htmlFor="workspace-name">工作区名称</Label>
                <Input id="workspace-name" defaultValue="我的公司" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="workspace-domain">工作区域名</Label>
                <Input id="workspace-domain" defaultValue="my-company.zhiliaotong.com" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
