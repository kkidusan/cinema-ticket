import { NextResponse } from "next/server";

export function middleware(req) {
  const token = req.cookies.get("token")?.value;
  const { pathname } = req.nextUrl;

  // If user is NOT logged in, prevent access to /user and redirect to /login
  if (!token && pathname.startsWith("/user")) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // If user is logged in, prevent access to /login and redirect to /user
  if (token && pathname === "/login") {
    return NextResponse.redirect(new URL("/user", req.url));
  }

  return NextResponse.next();
}

// Apply middleware only to these routes
export const config = {
  matcher: ["/dashbord",]
};
