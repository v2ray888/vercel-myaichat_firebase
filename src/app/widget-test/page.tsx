"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { useSession } from "@/hooks/use-session";
import { useRouter } from "next/navigation";


type Settings = {
  id: string;
  // other properties are not needed for this test
};

export default function WidgetTestPage() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { session, isLoading: isSessionLoading } = useSession();
  const router = useRouter();


  useEffect(() => {
    if (!isSessionLoading && !session) {
        router.push('/login?redirect=/widget-test');
    }
  }, [session, isSessionLoading, router]);

  useEffect(() => {
    if (!session) return; // Don't run if user is not logged in

    async function fetchSettingsAndInjectScript() {
      try {
        // 1. Fetch settings to get the appId
        const response = await fetch('/api/settings');
        if (!response.ok) throw new Error("无法获取应用ID");
        const data: Settings = await response.json();
        setSettings(data);

        // 2. Check if script is already injected
        if (document.getElementById('zhiliaotong-widget-script')) {
            setIsLoading(false);
            return;
        }

        // 3. Dynamically create and inject the script
        const script = document.createElement('script');
        
        // Use a data attribute for settings to avoid global window pollution if not desired
        script.innerHTML = `
          window.zhiliaotongSettings = {
            appId: "${data.id}",
          };
        `;
        document.head.appendChild(script);

        const widgetScript = document.createElement('script');
        widgetScript.id = 'zhiliaotong-widget-script';
        widgetScript.src = `${window.location.origin}/widget.js`;
        widgetScript.async = true;
        widgetScript.defer = true;
        document.body.appendChild(widgetScript);

      } catch (error: any) {
        console.error(error);
        toast({
          variant: "destructive",
          title: "加载失败",
          description: `无法加载小部件: ${error.message}`
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchSettingsAndInjectScript();

  }, [toast, session]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl font-headline">小部件安装测试页面</CardTitle>
          <CardDescription>
            这里模拟了一个安装了您的智聊通聊天小部件的第三方网站。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            如果一切正常，您应该会在页面的右下角看到一个聊天图标。点击它，就可以开始与您的工作台进行实时对话了。
          </p>
          <div className="p-4 border-dashed border-2 rounded-lg bg-muted">
            <h3 className="font-semibold mb-2">测试步骤:</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>点击右下角的聊天图标，打开聊天窗口。</li>
              <li>发送一条消息，例如“你好，这是一个测试！”。</li>
              <li>
                在另一个浏览器标签页中，打开您的 
                <Link href="/dashboard/workbench" className="text-primary underline hover:text-primary/80" target="_blank">
                  工作台 <ExternalLink className="inline-block h-3 w-3 ml-1" />
                </Link>
                。
              </li>
              <li>您应该能在工作台中看到来自“小部件测试页面”的新对话，并可以进行回复。</li>
            </ol>
          </div>
          {isLoading && (
            <div className="space-y-2">
                <p className="text-sm text-primary">正在动态加载和注入小部件...</p>
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-2/3" />
            </div>
          )}
           {!isLoading && settings && (
            <div className="text-xs text-green-700 bg-green-50 p-3 rounded-md">
                <p><strong>加载成功!</strong></p>
                <p>已成功为您注入ID为 <strong>{settings.id}</strong> 的小部件脚本。</p>
            </div>
           )}
        </CardContent>
      </Card>
    </div>
  );
}
