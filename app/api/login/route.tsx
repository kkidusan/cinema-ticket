// app/api/login/route.ts
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { auth, db, signInWithEmailAndPassword, collection, query, where, getDocs } from "../../firebaseconfig";

const JWT_SECRET_OWNER = process.env.JWT_SECRET_OWNER;
const JWT_SECRET_ADMIN = process.env.JWT_SECRET_ADMIN;

if (!JWT_SECRET_OWNER || !JWT_SECRET_ADMIN) {
  throw new Error("JWT_SECRET_OWNER and JWT_SECRET_ADMIN must be set in environment variables");
}

export async function POST(request: Request) {
  try {
    if (!auth || !db) {
      return NextResponse.json(
        { error: "Firebase not initialized. Please check configuration." },
        { status: 500 }
      );
    }

    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    const ownerRef = collection(db, "owner");
    const ownerQuery = query(ownerRef, where("email", "==", user.email));
    const ownerSnapshot = await getDocs(ownerQuery);

    const adminRef = collection(db, "admin");
    const adminQuery = query(adminRef, where("email", "==", user.email));
    const adminSnapshot = await getDocs(adminQuery);

    let role = null;
    let token = null;

    if (!ownerSnapshot.empty) {
      role = "owner";
      token = jwt.sign(
        { userId: user.uid, email: user.email, role },
        JWT_SECRET_OWNER,
        { expiresIn: "1h" }
      );
    } else if (!adminSnapshot.empty) {
      role = "admin";
      token = jwt.sign(
        { userId: user.uid, email: user.email, role },
        JWT_SECRET_ADMIN,
        { expiresIn: "1h" }
      );
    } else {
      return NextResponse.json({ error: "User not found in Firestore." }, { status: 403 });
    }

    const response = NextResponse.json({ message: "Login successful", role, email: user.email });
    response.cookies.set(`${role}_token`, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 3600,
      path: "/",
      sameSite: "strict",
    });

    response.cookies.set(`${role === "owner" ? "admin" : "owner"}_token`, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      expires: new Date(0),
      path: "/",
      sameSite: "strict",
    });

    return response;
  } catch (error: any) {
    console.error("Login error:", error);
    let errorMessage = "Login failed. Please check your credentials.";
    switch (error.code) {
      case "auth/user-not-found":
        errorMessage = "No user found with this email.";
        break;
      case "auth/wrong-password":
        errorMessage = "Incorrect password.";
        break;
      case "auth/invalid-email":
        errorMessage = "Invalid email address.";
        break;
      case "auth/too-many-requests":
        errorMessage = "Too many failed attempts. Please try again later.";
        break;
      default:
        errorMessage = `Login failed: ${error.message || "Unknown error"}`;
    }
    return NextResponse.json({ error: errorMessage }, { status: 401 });
  }
}

export const dynamic = "force-dynamic";