"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Copy } from "lucide-react"

export default function CodePage() {
  const { toast } = useToast()
  const codeSnippet = `<script>
  window.zhiliaotongSettings = {
    appId: "YOUR_APP_ID",
  };
</script>
<script src="https://cdn.zhiliaotong.com/widget.js" async defer></script>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(codeSnippet);
    toast({
      title: "已复制!",
      description: "代码已成功复制到剪贴板。",
    })
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
          <div className="bg-muted p-4 rounded-lg overflow-x-auto relative group">
            <pre>
                <code className="font-code text-sm text-foreground">{codeSnippet}</code>
            </pre>
            <Button size="icon" variant="ghost" className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={handleCopy}>
                <Copy className="h-4 w-4"/>
                <span className="sr-only">复制</span>
            </Button>
          </div>
          <Button className="mt-4" onClick={handleCopy}>
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
