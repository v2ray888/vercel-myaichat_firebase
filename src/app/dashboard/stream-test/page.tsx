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
      streamWriterRef.current.close();
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
    </div>
  );
}
