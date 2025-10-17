import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';

const PROTECTED_ROUTES = ['/dashboard'];

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  const isProtectedRoute = PROTECTED_ROUTES.some((route) => pathname.startsWith(route));

  if (isProtectedRoute) {
    const session = await getSession();
    if (!session) {
      const url = req.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
