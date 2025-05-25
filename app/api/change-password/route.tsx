// app/api/change-password/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { auth, signInWithEmailAndPassword, updatePassword } from "../../firebaseconfig";

const JWT_SECRET_OWNER = process.env.JWT_SECRET_OWNER;
const JWT_SECRET_ADMIN = process.env.JWT_SECRET_ADMIN;

if (!JWT_SECRET_OWNER || !JWT_SECRET_ADMIN) {
  throw new Error("JWT_SECRET_OWNER and JWT_SECRET_ADMIN must be set in environment variables");
}

function validatePassword(password: string): { valid: boolean; error?: string } {
  if (password.length < 8) {
    return { valid: false, error: "New password must be at least 8 characters" };
  }
  if (!/(?=.*[A-Z])/.test(password)) {
    return { valid: false, error: "New password requires an uppercase letter" };
  }
  if (!/(?=.*[a-z])/.test(password)) {
    return { valid: false, error: "New password requires a lowercase letter" };
  }
  if (!/(?=.*[0-9])/.test(password)) {
    return { valid: false, error: "New password requires a number" };
  }
  if (!/(?=.*[!@#$%^&*(),.?":{}|<>])/.test(password)) {
    return { valid: false, error: "New password requires a special character" };
  }
  return { valid: true };
}

export async function POST(request: Request) {
  try {
    if (!auth) {
      return NextResponse.json(
        { error: "Firebase not initialized. Please check configuration." },
        { status: 500 }
      );
    }

    const cookieStore = await cookies();
    const ownerToken = cookieStore.get("owner_token")?.value;
    const adminToken = cookieStore.get("admin_token")?.value;

    if (!ownerToken && !adminToken) {
      return NextResponse.json({ error: "Unauthorized: No token provided" }, { status: 401 });
    }

    let decoded: any;
    let role: string | undefined;

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
      if (error.name === "JsonWebTokenError") {
        return NextResponse.json({ error: "Invalid token" }, { status: 401 });
      }
      if (error.name === "TokenExpiredError") {
        return NextResponse.json({ error: "Token expired" }, { status: 401 });
      }
      throw new Error(`Token verification failed: ${error.message}`);
    }

    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
    }

    const { email, currentPassword, newPassword } = body;

    if (!email || !currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Email, current password, and new password are required" },
        { status: 400 }
      );
    }

    if (decoded.email !== email) {
      return NextResponse.json({ error: "Invalid user" }, { status: 403 });
    }

    let user;
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, currentPassword);
      user = userCredential.user;
    } catch (error: any) {
      switch (error.code) {
        case "auth/wrong-password":
          return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
        case "auth/too-many-requests":
          return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
        case "auth/user-not-found":
          return NextResponse.json({ error: "User not found" }, { status: 401 });
        case "auth/invalid-email":
          return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
        default:
          return NextResponse.json({ error: "Authentication failed" }, { status: 401 });
      }
    }

    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return NextResponse.json({ error: passwordValidation.error }, { status: 400 });
    }

    await updatePassword(user, newPassword);

    if (!role) {
      throw new Error("Role is undefined");
    }

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

export const dynamic = "force-dynamic";