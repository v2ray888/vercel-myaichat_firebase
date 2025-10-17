'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function StreamTestPage() {
  
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold font-headline">流式 HTTP 实时聊天测试</h1>
      <Card>
        <CardHeader>
          <CardTitle>测试说明</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-4">
            <p>聊天小部件已加载并连接到我们的流式聊天服务器。</p>
            <p>1. 点击页面右下角的聊天图标以打开聊天窗口。</p>
            <p>2. 您可以打开多个浏览器窗口或标签页并同时访问此页面，每个窗口都会有一个独立的聊天小部件实例。</p>
            <p>3. 在一个小部件中发送消息，该消息将会被广播到所有其他打开的小部件中，从而实现实时多用户聊天。</p>
            <p>4. 小部件的标题栏会显示当前客户端的唯一ID（前6位），方便您区分不同的客户端。</p>
        </CardContent>
      </Card>
    </div>
  );
}
