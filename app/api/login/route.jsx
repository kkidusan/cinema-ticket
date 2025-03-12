import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { auth, signInWithEmailAndPassword, db } from "../../firebaseconfig";
import { collection, query, where, getDocs } from "firebase/firestore";

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

    // Check if the user exists in the "owner" collection
    const ownerRef = collection(db, "owner");
    const ownerQuery = query(ownerRef, where("email", "==", user.email));
    const ownerSnapshot = await getDocs(ownerQuery);

    // Check if the user exists in the "admin" collection
    const adminRef = collection(db, "admin");
    const adminQuery = query(adminRef, where("email", "==", user.email));
    const adminSnapshot = await getDocs(adminQuery);

    let role = null;

    // Determine the user's role
    if (!ownerSnapshot.empty) {
      role = "owner";
    } else if (!adminSnapshot.empty) {
      role = "admin";
    } else {
      return NextResponse.json({ error: "User not found in Firestore." }, { status: 403 });
    }

    // Generate JWT
    const token = jwt.sign({ userId: user.uid, email: user.email, role }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    // Set JWT in a cookie
    const response = NextResponse.json({ message: "Login successful", role, email: user.email });
    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 3600, // 1 hour
      path: "/",
    });

    return response;
  } catch (error) {
    // Handle specific Firebase errors
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