import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import ChatWidget from '@/components/chat-widget';
import { Poppins, PT_Sans } from 'next/font/google';
import { cn } from '@/lib/utils';

const fontHeadline = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-headline',
});

const fontBody = PT_Sans({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-body',
});


export const metadata: Metadata = {
  title: '智聊通 - 智能在线客服系统',
  description: '智聊通 (ZhiLiaoTong) - 您的完整实时在线客服解决方案',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={cn("font-body antialiased", fontHeadline.variable, fontBody.variable)}>
        {children}
        <Toaster />
        <ChatWidget />
      </body>
    </html>
  );
}
