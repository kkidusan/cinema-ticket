// app/api/change-password/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { auth, signInWithEmailAndPassword, updatePassword } from "../../firebaseconfig";

// Define JWT secrets (use environment variables in production)
const JWT_SECRET_OWNER = process.env.JWT_SECRET_OWNER || "4f56a9c80b8e9d8e2f24eab3e94a3458a569fb8094538724bb9b7efc8d944c3a7";
const JWT_SECRET_ADMIN = process.env.JWT_SECRET_ADMIN || "a7b3e9f2c1d8a4b6e5f7c9d3a2b8e4f6c7d9a1b3e5f2c8a4b6d7e9f1c3a5b7d8";

export async function POST(request: Request) {
  try {
    // Access cookies safely - now using await since cookies() is async
    const cookieStore = await cookies();
    const ownerToken = cookieStore.get("owner_token")?.value;
    const adminToken = cookieStore.get("admin_token")?.value;

    // Check for token existence
    if (!ownerToken && !adminToken) {
      return NextResponse.json({ error: "Unauthorized: No token provided" }, { status: 401 });
    }

    let decoded: any;
    let role: string | undefined;

    // Verify token based on role
    try {
      if (ownerToken) {
        decoded = jwt.verify(ownerToken, JWT_SECRET_OWNER);
        role = decoded.role;
        if (role !== "owner") {
          return NextResponse.json({ error: "Invalid token role" }, { status: 401 });
        }
      } else if (adminToken) {
        decoded = jwt.verify(adminToken, JWT_SECRET_ADMIN);
        role = decoded.role;
        if (role !== "admin") {
          return NextResponse.json({ error: "Invalid token role" }, { status: 401 });
        }
      }
    } catch (error: any) {
      if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
        return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
      }
      throw new Error(`Token verification failed: ${error.message}`);
    }

    // Parse request body
    const { email, currentPassword, newPassword } = await request.json();

    if (!email || !currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Email, current password, and new password are required" },
        { status: 400 }
      );
    }

    // Verify the token's email matches the request email
    if (decoded.email !== email) {
      return NextResponse.json({ error: "Invalid user" }, { status: 403 });
    }

    // Re-authenticate the user
    let user;
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, currentPassword);
      user = userCredential.user;
    } catch (error: any) {
      if (error.code === "auth/wrong-password") {
        return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
      } else if (error.code === "auth/too-many-requests") {
        return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
      } else if (error.code === "auth/user-not-found") {
        return NextResponse.json({ error: "User not found" }, { status: 401 });
      }
      return NextResponse.json({ error: "Authentication failed" }, { status: 401 });
    }

    // Validate new password
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "New password must be at least 8 characters" },
        { status: 400 }
      );
    }
    if (!/(?=.*[A-Z])/.test(newPassword)) {
      return NextResponse.json(
        { error: "New password requires an uppercase letter" },
        { status: 400 }
      );
    }
    if (!/(?=.*[a-z])/.test(newPassword)) {
      return NextResponse.json(
        { error: "New password requires a lowercase letter" },
        { status: 400 }
      );
    }
    if (!/(?=.*[0-9])/.test(newPassword)) {
      return NextResponse.json(
        { error: "New password requires a number" },
        { status: 400 }
      );
    }
    if (!/(?=.*[!@#$%^&*(),.?":{}|<>])/.test(newPassword)) {
      return NextResponse.json(
        { error: "New password requires a special character" },
        { status: 400 }
      );
    }

    // Update the password
    await updatePassword(user, newPassword);

    // Invalidate the current session by clearing the token
    const response = NextResponse.json({ message: "Password updated successfully" }, { status: 200 });
    response.cookies.set(`${role}_token`, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      expires: new Date(0),
      path: "/",
      sameSite: "strict",
    });

    return response;
  } catch (error: any) {
    console.error("Change password error:", error);
    return NextResponse.json(
      { error: `An error occurred while updating the password: ${error.message || "Unknown error"}` },
      { status: 500 }
    );
  }
}

// Optional: Export config to force dynamic evaluation
export const dynamic = "force-dynamic";