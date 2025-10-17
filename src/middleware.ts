import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';

const PROTECTED_ROUTES = ['/dashboard'];
const PUBLIC_ROUTES = ['/login', '/signup', '/'];

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const session = await getSession();

  const isProtectedRoute = PROTECTED_ROUTES.some((route) => pathname.startsWith(route));
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  if (isProtectedRoute && !session) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  
  if (session && (pathname === '/login' || pathname === '/signup')) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
