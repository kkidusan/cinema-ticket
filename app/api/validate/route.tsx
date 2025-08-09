// app/api/auth/route.tsx
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

// Access environment variables
const JWT_SECRET_OWNER = process.env.JWT_SECRET_OWNER;
const JWT_SECRET_ADMIN = process.env.JWT_SECRET_ADMIN;

// Validate environment variables
if (!JWT_SECRET_OWNER || !JWT_SECRET_ADMIN) {
    console.error("Environment variables JWT_SECRET_OWNER or JWT_SECRET_ADMIN are not set.");
}

export async function GET() {
    try {
        const cookieStore = await cookies();
        const ownerToken = cookieStore.get("owner_token")?.value;
        const adminToken = cookieStore.get("admin_token")?.value;

        // Early return if no tokens are present
        if (!ownerToken && !adminToken) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        let decoded: any;
        let role: string | undefined;

        // Verify owner token if present
        if (ownerToken && JWT_SECRET_OWNER) {
            decoded = jwt.verify(ownerToken, JWT_SECRET_OWNER);
            role = decoded.role;
            if (role !== "owner") {
                return NextResponse.json({ error: "Invalid token role" }, { status: 401 });
            }
        }
        // Verify admin token if present
        else if (adminToken && JWT_SECRET_ADMIN) {
            decoded = jwt.verify(adminToken, JWT_SECRET_ADMIN);
            role = decoded.role;
            if (role !== "admin") {
                return NextResponse.json({ error: "Invalid token role" }, { status: 401 });
            }
        } else {
            return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
        }

        // Return email and role
        return NextResponse.json({ email: decoded.email, role: decoded.role }, { status: 200 });
    } catch (error: any) {
        console.error("Token verification error:", {
            message: error.message,
            stack: error.stack,
        });

        if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
            return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
        }
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export const dynamic = "force-dynamic";