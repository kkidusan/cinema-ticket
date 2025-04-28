import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { auth, signInWithEmailAndPassword, updatePassword } from "../../firebaseconfig"; // Updated path
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

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
    } catch (error) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 401 }
      );
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
    if (!/(?=.*[0-9])/.test(newPassword)) {
      return NextResponse.json(
        { error: "New password requires a number" },
        { status: 400 }
      );
    }
    if (!/(?=.*[!@#$%^&*])/.test(newPassword)) {
      return NextResponse.json(
        { error: "New password requires a special character" },
        { status: 400 }
      );
    }

    // Update the password
    await updatePassword(user, newPassword);

    return NextResponse.json({ message: "Password updated successfully" }, { status: 200 });
  } catch (error) {
    console.error("Change password error:", error);
    if (error.name === "JsonWebTokenError") {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    if (error.name === "TokenExpiredError") {
      return NextResponse.json({ error: "Session expired" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "An error occurred while updating the password" },
      { status: 500 }
    );
  }
}