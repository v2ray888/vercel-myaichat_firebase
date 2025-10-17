'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Send } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

export default function StreamTestPage() {
  const [messages, setMessages] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamId, setStreamId] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { toast } = useToast();

  const startStreaming = async () => {
    abortControllerRef.current = new AbortController();
    
    setIsStreaming(true);
    setMessages(['正在连接流...']);

    try {
      const response = await fetch('/api/stream-chat', {
        method: 'GET',
        signal: abortControllerRef.current.signal,
      });

      if (!response.body || !response.ok) {
        throw new Error('无法建立流连接。');
      }

      const receivedStreamId = response.headers.get('X-Stream-Id');
      if (!receivedStreamId) {
        throw new Error('未收到流 ID。');
      }
      setStreamId(receivedStreamId);
      setMessages((prev) => [...prev, `连接成功！您的 ID 是: ${receivedStreamId}`]);
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          setMessages((prev) => [...prev, '流已由服务器关闭。']);
          break;
        }
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n\n').filter(Boolean);
        lines.forEach(line => {
            if (line.startsWith('data: ')) {
                const data = line.substring(6);
                setMessages((prev) => [...prev, data]);
            }
        });
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        setMessages((prev) => [...prev, '流已由用户中止。']);
      } else {
        setMessages((prev) => [...prev, `发生错误: ${error.message}`]);
      }
    } finally {
      setIsStreaming(false);
      setStreamId(null);
      abortControllerRef.current = null;
    }
  };

  const stopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };
  
  const handleSendMessage = async () => {
    if (!inputValue.trim() || !isStreaming || !streamId) {
        toast({
            variant: "destructive",
            title: "无法发送消息",
            description: "请先建立连接。",
        });
        return;
    }
    
    try {
        setMessages((prev) => [...prev, `您: ${inputValue}`]);
        const response = await fetch('/api/stream-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: inputValue, streamId }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`服务器错误: ${errorText}`);
        }

    } catch (error: any) {
        setMessages((prev) => [...prev, `发送失败: ${error.message}`]);
    }

    setInputValue('');
  };

  useEffect(() => {
    return () => {
      stopStreaming();
    };
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold font-headline">流式 HTTP 实时聊天测试</h1>
      <Card>
        <CardHeader>
          <CardTitle>聊天窗口</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-80 w-full rounded-md border bg-muted p-4 overflow-y-auto flex flex-col gap-2">
            {messages.map((msg, index) => (
              <div key={index} className="text-sm">{msg}</div>
            ))}
          </div>
          <div className="flex gap-2">
            <Button onClick={startStreaming} disabled={isStreaming}>开始连接</Button>
            <Button onClick={stopStreaming} disabled={!isStreaming} variant="destructive">断开连接</Button>
          </div>
        </CardContent>
        <CardFooter className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={isStreaming ? "输入消息..." : "请先开始连接"}
            disabled={!isStreaming}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
          />
          <Button onClick={handleSendMessage} disabled={!isStreaming}>
            发送 <Send className="ml-2 h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>
      <Card>
        <CardHeader>
            <CardTitle>说明</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>此页面演示了如何使用 Streamable HTTP 实现真正的双向实时通信。</p>
            <p>1. 点击 <strong>开始连接</strong>，浏览器会向服务器发起一个 GET 请求来建立一个持久的连接，用于接收消息。</p>
            <p>2. 服务器会为您分配一个唯一的流 ID，并保持连接开启。</p>
            <p>3. 在输入框中发送消息。浏览器会发起一个独立的 POST 请求将您的消息和流 ID 发送到服务器。</p>
            <p>4. 服务器收到消息后，会通过之前建立的 GET 连接将消息广播给所有连接的客户端。</p>
            <p>5. 您可以在多个浏览器窗口中打开此页面，点击“开始连接”，它们将可以互相通信。</p>
            <p>6. 点击 <strong>断开连接</strong> 来关闭流并中止请求。</p>
        </CardContent>
      </Card>
    </div>
  );
}