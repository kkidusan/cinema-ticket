import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export async function GET(req) {
  const cookieStore = cookies();
  const token = cookieStore.get("token")?.value;

  // Early return if token is missing
  if (!token) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Verify the token and decode it
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Return email and role
    return Response.json({ email: decoded.email, role: decoded.role }, { status: 200 });
  } catch (error) {
    // Handle specific JWT errors
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return Response.json({ error: "Invalid or expired token" }, { status: 401 });
    }
    // Handle unexpected errors
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}