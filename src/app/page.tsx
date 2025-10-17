import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export default function Home() {
  const heroImage = PlaceHolderImages.find(p => p.id === 'hero-image');

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2" aria-label="智聊通 Home">
            <Icons.logo className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold font-headline">智聊通</span>
          </Link>
          <nav className="flex items-center gap-2 sm:gap-4">
            <Button variant="ghost" asChild>
              <Link href="/login">登录</Link>
            </Button>
            <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
              <Link href="/signup">免费注册</Link>
            </Button>
          </nav>
        </div>
      </header>
      <main className="flex-grow flex items-center">
        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="grid gap-10 lg:grid-cols-2 lg:gap-12 xl:gap-16 items-center">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-4">
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none font-headline">
                    您的完整实时在线客服解决方案
                  </h1>
                  <p className="max-w-[600px] text-muted-foreground md:text-xl">
                    智聊通提供强大的实时聊天、智能机器人和客户管理功能，帮助您提升客户满意度和销售额。
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Button size="lg" asChild>
                    <Link href="/signup">开始使用</Link>
                  </Button>
                  <Button size="lg" variant="secondary" asChild>
                    <Link href="/dashboard/workbench">查看演示</Link>
                  </Button>
                </div>
              </div>
              <div className="w-full max-w-md mx-auto lg:max-w-none flex justify-center">
                {heroImage && (
                  <Image
                    alt="客服插画"
                    className="rounded-xl object-cover shadow-lg"
                    height="400"
                    src={heroImage.imageUrl}
                    data-ai-hint={heroImage.imageHint}
                    width="600"
                  />
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="py-6 border-t">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} 智聊通. 版权所有.
        </div>
      </footer>
    </div>
  );
}
