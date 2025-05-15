import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { auth, signInWithEmailAndPassword, db } from "../../firebaseconfig";
import { collection, query, where, getDocs } from "firebase/firestore";

// Define JWT secrets
const JWT_SECRET_OWNER = process.env.JWT_SECRET_OWNER || "4f56a9c80b8e9d8e2f24eab3e94a3458a569fb8094538724bb9b7efc8d944c3a7";
const JWT_SECRET_ADMIN = process.env.JWT_SECRET_ADMIN || "a7b3e9f2c1d8a4b6e5f7c9d3a2b8e4f6c7d9a1b3e5f2c8a4b6d7e9f1c3a5b7d8";

export async function POST(request) {
  const { email, password } = await request.json();

  // Basic validation
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  try {
    // Authenticate with Firebase
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Check if the user exists in the "owner" or "admin" collection
    const ownerRef = collection(db, "owner");
    const ownerQuery = query(ownerRef, where("email", "==", user.email));
    const ownerSnapshot = await getDocs(ownerQuery);

    const adminRef = collection(db, "admin");
    const adminQuery = query(adminRef, where("email", "==", user.email));
    const adminSnapshot = await getDocs(adminQuery);

    let role = null;
    let token = null;

    // Determine the user's role and generate role-specific JWT
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

    // Set JWT in a role-specific cookie and clear the other role's cookie
    const response = NextResponse.json({ message: "Login successful", role, email: user.email });
    response.cookies.set(`${role}_token`, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 3600, // 1 hour
      path: "/",
      sameSite: "strict",
    });

    // Clear the opposite role's cookie to prevent concurrent role access
    response.cookies.set(`${role === "owner" ? "admin" : "owner"}_token`, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      expires: new Date(0), // Immediate expiration
      path: "/",
      sameSite: "strict",
    });

    return response;
  } catch (error) {
    console.error("Firebase Error:", error);

    let errorMessage = "Login failed. Please check your credentials.";
    if (error.code === "auth/user-not-found") {
      errorMessage = "No user found with this email.";
    } else if (error.code === "auth/wrong-password") {
      errorMessage = "Incorrect password.";
    } else if (error.code === "auth/invalid-email") {
      errorMessage = "Invalid email address.";
    } else if (error.code === "auth/too-many-requests") {
      errorMessage = "Too many failed attempts. Please try again later.";
    }

    return NextResponse.json({ error: errorMessage }, { status: 401 });
  }
}