import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          res.cookies.set(name, value, options);
        },
        remove(name: string) {
          res.cookies.delete(name);
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // If user is signed in and trying to access /login, redirect to / (dashboard)
  if (user && req.nextUrl.pathname === '/login') {
    return NextResponse.redirect(new URL('/', req.url));
  }

  // If user is not signed in and trying to access a protected route, redirect to /login
  if (!user && req.nextUrl.pathname !== '/login') {
    // Define protected routes here. For now, all routes except /login are protected.
    // You might want to refine this with a more specific list or pattern.
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return res;
}

export const config = {
  matcher: ['/', '/login', '/batches/:path*', '/feed/:path*', '/reports/:path*', '/feed-usage/:path*', '/orders/:path*', '/transactions/:path*', '/settings/:path*', '/dressed-inventory/:path*', '/processing/:path*'],
};