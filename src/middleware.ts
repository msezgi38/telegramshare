import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    // Check if user is authenticated
    const authCookie = request.cookies.get('telegram_auth');

    // If trying to access dashboard without auth, redirect to login
    if (request.nextUrl.pathname.startsWith('/dashboard')) {
        if (!authCookie || authCookie.value !== 'authenticated') {
            return NextResponse.redirect(new URL('/login', request.url));
        }
    }

    // If already authenticated and trying to access login, redirect to dashboard
    if (request.nextUrl.pathname === '/login') {
        if (authCookie && authCookie.value === 'authenticated') {
            return NextResponse.redirect(new URL('/dashboard', request.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/dashboard/:path*', '/login'],
};
