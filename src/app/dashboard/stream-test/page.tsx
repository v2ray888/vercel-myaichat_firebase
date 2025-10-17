'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Send } from 'lucide-react';

export default function StreamTestPage() {
  const [messages, setMessages] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const streamWriterRef = useRef<WritableStreamDefaultWriter | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const startStreaming = async () => {
    abortControllerRef.current = new AbortController();
    const transformStream = new TransformStream();
    streamWriterRef.current = transformStream.writable.getWriter();

    setIsStreaming(true);
    setMessages(['连接流...']);

    try {
      const response = await fetch('/api/stream-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: transformStream.readable,
        signal: abortControllerRef.current.signal,
        // @ts-ignore
        duplex: 'half',
      });

      if (!response.body) {
        throw new Error('Response has no body');
      }

      setMessages((prev) => [...prev, '连接成功！现在可以发送消息了。']);
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          setMessages((prev) => [...prev, '流已关闭。']);
          break;
        }
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n\n').filter(Boolean);
        lines.forEach(line => {
            if (line.startsWith('data: ')) {
                const data = line.substring(6);
                if (data !== 'ping') {
                    setMessages((prev) => [...prev, `服务器: ${data}`]);
                } else {
                    console.log('Ping received');
                }
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
      streamWriterRef.current = null;
      abortControllerRef.current = null;
    }
  };

  const stopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (streamWriterRef.current) {
      try {
        streamWriterRef.current.close();
      } catch (e) {
        console.warn("Error closing stream writer:", e);
      }
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !streamWriterRef.current) return;

    try {
      await streamWriterRef.current.write(new TextEncoder().encode(inputValue));
      setMessages((prev) => [...prev, `您: ${inputValue}`]);
      setInputValue('');
    } catch (error: any) {
      setMessages((prev) => [...prev, `发送失败: ${error.message}`]);
    }
  };

  useEffect(() => {
    // Cleanup on component unmount
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
            placeholder="输入消息..."
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
            <p>此页面演示了如何使用 Streamable HTTP (Fetch API 的 `ReadableStream` 和 `TransformStream`) 实现单一 HTTP 请求下的双向实时通信。</p>
            <p>1. 点击 <strong>开始连接</strong>，浏览器会向 <code>/api/stream-chat</code> 发起一个 POST 请求。该请求的 `body` 是一个可读流，允许客户端随时向服务器发送数据。</p>
            <p>2. 服务器接收到请求后，会保持连接开放，并将收到的客户端消息加上 "Echo: " 前缀后，通过响应流发送回客户端。</p>
            <p>3. 服务器还会每3秒发送一个 "ping" 消息以保持连接活跃。</p>
            <p>4. 在输入框中发送消息，您会看到您的消息和服务器的 "Echo" 响应实时出现在聊天窗口中。</p>
            <p>5. 点击 <strong>断开连接</strong> 来关闭流并中止请求。</p>
        </CardContent>
      </Card>
    </div>
  );
}
