import { NextResponse } from "next/server";
import { verifyIdToken } from "./utils/firebaseAdmin"; // helper to verify Firebase token

export async function middleware(req) {
    // Get the Firebase session token from the cookie
    const token = req.cookies.get("token")?.value;

    if (!token) {
        // If token doesn't exist, redirect to the login page
        return NextResponse.redirect(new URL("/login", req.url));
    }

    try {
        // Verify the token
        await verifyIdToken(token);
        return NextResponse.next(); // Continue if the token is valid
    } catch (error) {
        // If the token is invalid or expired, redirect to login page
        return NextResponse.redirect(new URL("/login", req.url));
    }
}

// Apply middleware to protect all routes under /dashboard/*
export const config = {
    matcher: ["/dashboard/:path*"], // Protect all dashboard-related pages
};
