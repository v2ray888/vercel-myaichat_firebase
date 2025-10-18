import { NextRequest, NextResponse } from 'next/server';
import { decrypt } from '@/lib/session';
import { cookies } from 'next/headers';

const PROTECTED_ROUTES = ['/dashboard'];
const PUBLIC_ROUTES = ['/login', '/signup', '/'];

async function getSessionFromCookie() {
  const cookie = cookies().get('session')?.value;
  return await decrypt(cookie);
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const session = await getSessionFromCookie();

  const isProtectedRoute = PROTECTED_ROUTES.some((route) => pathname.startsWith(route));
  
  if (isProtectedRoute && !session) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  
  if (session && (pathname === '/login' || pathname === '/signup')) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|widget.js).*)'],
};
