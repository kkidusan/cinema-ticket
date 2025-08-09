// app/api/login/route.tsx
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { auth, db, signInWithEmailAndPassword, collection, query, where, getDocs } from "../../firebaseconfig";

// Access environment variables using Next.js convention
const JWT_SECRET_OWNER = process.env.JWT_SECRET_OWNER;
const JWT_SECRET_ADMIN = process.env.JWT_SECRET_ADMIN;

// Validate environment variables at startup
if (!JWT_SECRET_OWNER || !JWT_SECRET_ADMIN) {
    console.error("Environment variables JWT_SECRET_OWNER or JWT_SECRET_ADMIN are not set.");
    // Instead of throwing, return a response to avoid breaking the API
    // This allows the API to fail gracefully in production
    const errorResponse = NextResponse.json(
        { error: "Server configuration error. Please contact support." },
        { status: 500 }
    );
    // Log for debugging
    console.error("Ensure JWT_SECRET_OWNER and JWT_SECRET_ADMIN are set in .env.local or environment");
}

// Main POST handler
export async function POST(request: Request) {
    try {
        // Validate Firebase initialization
        if (!auth || !db) {
            console.error("Firebase initialization failed: auth or db is undefined");
            return NextResponse.json(
                { error: "Firebase not initialized. Please check configuration." },
                { status: 500 }
            );
        }

        const { email, password } = await request.json();

        if (!email || !password) {
            return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
        }

        // Attempt to sign in with Firebase Auth
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Query Firestore for user role
        const ownerRef = collection(db, "owner");
        const ownerQuery = query(ownerRef, where("email", "==", user.email));
        const ownerSnapshot = await getDocs(ownerQuery);

        const adminRef = collection(db, "admin");
        const adminQuery = query(adminRef, where("email", "==", user.email));
        const adminSnapshot = await getDocs(adminQuery);

        let role: string | null = null;
        let token: string | null = null;

        if (!ownerSnapshot.empty) {
            role = "owner";
            token = jwt.sign(
                { userId: user.uid, email: user.email, role },
                JWT_SECRET_OWNER!,
                { expiresIn: "1h" }
            );
        } else if (!adminSnapshot.empty) {
            role = "admin";
            token = jwt.sign(
                { userId: user.uid, email: user.email, role },
                JWT_SECRET_ADMIN!,
                { expiresIn: "1h" }
            );
        } else {
            return NextResponse.json({ error: "User not found in Firestore." }, { status: 403 });
        }

        // Set role-specific cookie
        const response = NextResponse.json({ message: "Login successful", role, email: user.email });
        response.cookies.set(`${role}_token`, token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            maxAge: 3600, // 1 hour
            path: "/",
            sameSite: "strict",
        });

        // Clear the other role's cookie
        response.cookies.set(`${role === "owner" ? "admin" : "owner"}_token`, "", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            expires: new Date(0),
            path: "/",
            sameSite: "strict",
        });

        return response;
    } catch (error: any) {
        console.error("Login error:", {
            code: error.code,
            message: error.message,
            stack: error.stack,
        });

        let errorMessage = "Login failed. Please check your credentials.";
        let status = 401;

        switch (error.code) {
            case "auth/invalid-api-key":
                errorMessage = "Invalid Firebase API key. Please contact support.";
                status = 500;
                break;
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

        return NextResponse.json({ error: errorMessage }, { status });
    }
}

export const dynamic = "force-dynamic";