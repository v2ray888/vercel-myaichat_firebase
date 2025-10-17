
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function StreamTestPage() {
  
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold font-headline">实时聊天系统测试</h1>
      <Card>
        <CardHeader>
          <CardTitle>测试说明</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-4">
            <p>聊天系统已全面接入真实数据流。您可以通过以下方式测试端到端的客服聊天功能：</p>
            <p className='font-semibold'>1. 扮演客服:</p>
            <p>在当前浏览器窗口，导航到 <a href="/dashboard/workbench" className='text-primary underline'>工作台</a>。这里是客服的操作界面。</p>
            <p className='font-semibold'>2. 扮演客户:</p>
            <p>打开一个新的浏览器窗口 (最好是无痕模式，以模拟不同用户)，访问您应用的首页 (例如，<a href="/" className='text-primary underline'>/</a>)。</p>
            <p className='font-semibold'>3. 开始对话:</p>
            <p>在客户窗口中，点击右下角的聊天图标，打开聊天小部件并发起对话。</p>
            <p className='font-semibold'>4. 实时交互:</p>
            <p>您会看到，客户发送的消息会实时出现在客服的工作台中。客服在工作台的回复也会实时发送到客户的聊天小部件里。</p>
        </CardContent>
      </Card>
    </div>
  );
}
