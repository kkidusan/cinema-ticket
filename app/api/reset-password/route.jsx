import { NextResponse } from "next/server";
import { doc, getDoc, deleteDoc } from "firebase/firestore";
import admin from "firebase-admin";
import { db } from "../../firebaseconfig";

// Initialize Firebase Admin SDK only once
if (!admin.apps.length) {
  try {
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    };

    // Validate environment variables
    if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
      throw new Error("Missing Firebase Admin SDK credentials in environment variables.");
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error) {
    console.error("Firebase Admin SDK initialization error:", error.message);
    // Do not throw here; handle errors in the API response
  }
}

export async function POST(request) {
  // Check if Firebase Admin SDK is initialized
  if (!admin.apps.length) {
    return NextResponse.json(
      { error: "Server configuration error: Firebase Admin SDK not initialized" },
      { status: 500 }
    );
  }

  try {
    const { email, otp, newPassword } = await request.json();

    // Validate input
    if (!email || !otp || !newPassword) {
      return NextResponse.json(
        { error: "Missing required fields: email, otp, and newPassword are required" },
        { status: 400 }
      );
    }

    // Verify OTP
    const otpDoc = await getDoc(doc(db, "otp", email));
    if (!otpDoc.exists()) {
      return NextResponse.json({ error: "OTP expired or invalid" }, { status: 400 });
    }

    const { otp: storedOtp, expiresAt } = otpDoc.data();
    if (new Date(expiresAt) < new Date()) {
      await deleteDoc(doc(db, "otp", email));
      return NextResponse.json({ error: "OTP has expired" }, { status: 400 });
    }

    if (otp !== storedOtp) {
      return NextResponse.json({ error: "Invalid OTP" }, { status: 400 });
    }

    // Update password
    try {
      const user = await admin.auth().getUserByEmail(email);
      await admin.auth().updateUser(user.uid, { password: newPassword });
    } catch (authError) {
      const errorMessages = {
        "auth/user-not-found": "No account found with this email",
        "auth/invalid-email": "Invalid email format",
        "auth/too-many-requests": "Too many attempts. Please try again later",
      };
      const message =
        errorMessages[authError.code] ||
        `Failed to update password: ${authError.message}`;
      return NextResponse.json(
        { error: message },
        { status: authError.code === "auth/user-not-found" ? 400 : 500 }
      );
    }

    // Clean up OTP
    try {
      await deleteDoc(doc(db, "otp", email));
    } catch (deleteError) {
      console.warn("Failed to delete OTP document:", deleteError.message);
      // Continue despite cleanup failure
    }

    return NextResponse.json({ message: "Password reset successfully" }, { status: 200 });
  } catch (error) {
    console.error("Reset password error:", error.message);
    return NextResponse.json(
      { error: `Failed to reset password: ${error.message}` },
      { status: 500 }
    );
  }
}