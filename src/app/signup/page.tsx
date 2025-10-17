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

export default function SignupPage() {
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
            <CardTitle className="text-2xl font-headline">创建账户</CardTitle>
            <CardDescription>
              输入您的信息以创建一个新账户
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">姓名</Label>
              <Input id="name" placeholder="您的姓名" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">邮箱</Label>
              <Input id="email" type="email" placeholder="m@example.com" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input id="password" type="password" required />
            </div>
            <Button type="submit" className="w-full" asChild>
                <Link href="/dashboard">创建账户</Link>
            </Button>
          </CardContent>
          <div className="mt-4 text-center text-sm p-6 pt-0">
            已经有账户了?{" "}
            <Link href="/login" className="underline font-semibold">
              登录
            </Link>
          </div>
        </Card>
      </div>
    </div>
  )
}
