"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { Copy } from "lucide-react"

type Settings = {
  id: string;
  // other settings properties are not needed for this page
}

export default function CodePage() {
  const { toast } = useToast()
  const [settings, setSettings] = useState<Settings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [widgetScriptUrl, setWidgetScriptUrl] = useState("");

  useEffect(() => {
    // Dynamically construct the widget URL based on the current host.
    // This ensures it works in development, preview, and production.
    setWidgetScriptUrl(`${window.location.origin}/widget.js`);

    async function fetchSettings() {
      try {
        const response = await fetch('/api/settings');
        if (!response.ok) throw new Error("Failed to fetch settings");
        const data = await response.json();
        setSettings(data);
      } catch (error) {
        console.error(error);
        toast({
          variant: "destructive",
          title: "加载失败",
          description: "无法加载您的应用ID，请稍后重试。"
        })
      } finally {
        setIsLoading(false);
      }
    }
    fetchSettings();
  }, [toast]);

  const codeSnippet = `<script>
  window.zhiliaotongSettings = {
    appId: "${settings?.id || 'YOUR_APP_ID'}",
  };
</script>
<script src="${widgetScriptUrl}" async defer></script>`;

  const handleCopy = () => {
    if (settings?.id && widgetScriptUrl) {
        navigator.clipboard.writeText(codeSnippet);
        toast({
          title: "已复制!",
          description: "代码已成功复制到剪贴板。",
        })
    } else {
         toast({
            variant: "destructive",
            title: "复制失败",
            description: "无法复制，因为应用ID或脚本地址不可用。"
        })
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold font-headline">代码嵌入</h1>
      <Card>
        <CardHeader>
          <CardTitle>安装智聊通</CardTitle>
          <CardDescription>将此代码片段复制并粘贴到您的网站的 `&lt;head&gt;` 标签结束之前。</CardDescription>
        </CardHeader>
        <CardContent>
            {isLoading ? (
                <div className="bg-muted p-4 rounded-lg">
                    <Skeleton className="h-24 w-full" />
                </div>
            ) : (
                 <div className="bg-muted p-4 rounded-lg overflow-x-auto relative group">
                    <pre>
                        <code className="font-code text-sm text-foreground">{codeSnippet}</code>
                    </pre>
                    <Button size="icon" variant="ghost" className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={handleCopy} disabled={!settings?.id || !widgetScriptUrl}>
                        <Copy className="h-4 w-4"/>
                        <span className="sr-only">复制</span>
                    </Button>
                 </div>
            )}
         
          <Button className="mt-4" onClick={handleCopy} disabled={!settings?.id || isLoading || !widgetScriptUrl}>
            <Copy className="mr-2 h-4 w-4" /> 复制代码
          </Button>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
            <CardTitle>工作原理</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-muted-foreground">
            <p>1. 上述脚本会异步加载智聊通的聊天小部件。</p>
            <p>2. `window.zhiliaotongSettings` 对象允许您在加载时传递配置，例如您的唯一 `appId`。</p>
            <p>3. 脚本加载后，聊天小部件将根据您在后台的设置自动显示在您网站的右下角。</p>
        </CardContent>
      </Card>
    </div>
  )
}
