import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Icons } from "@/components/icons"

export default function LoginPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-full max-w-md mx-auto p-4">
        <Card className="shadow-xl">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
                <Link href="/" className="flex items-center gap-2">
                    <Icons.logo className="h-8 w-8 text-primary" />
                    <span className="text-xl font-bold font-headline">智聊通</span>
                </Link>
            </div>
            <CardTitle className="text-2xl font-headline">欢迎回来</CardTitle>
            <CardDescription>
              输入您的邮箱和密码以登录您的账户
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">邮箱</Label>
              <Input id="email" type="email" placeholder="m@example.com" required />
            </div>
            <div className="space-y-2">
              <div className="flex items-center">
                <Label htmlFor="password">密码</Label>
                <Link href="#" className="ml-auto inline-block text-sm underline">
                  忘记密码?
                </Link>
              </div>
              <Input id="password" type="password" required />
            </div>
            <Button type="submit" className="w-full" asChild>
                <Link href="/dashboard">登录</Link>
            </Button>
            <Button variant="outline" className="w-full">
              使用 Google 登录
            </Button>
          </CardContent>
          <div className="mt-4 text-center text-sm p-6 pt-0">
            还没有账户?{" "}
            <Link href="/signup" className="underline font-semibold">
              注册
            </Link>
          </div>
        </Card>
      </div>
    </div>
  )
}
