import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

// Define JWT secrets
const JWT_SECRET_OWNER = "4f56a9c80b8e9d8e2f24eab3e94a3458a569fb8094538724bb9b7efc8d944c3a7";
const JWT_SECRET_ADMIN = "a7b3e9f2c1d8a4b6e5f7c9d3a2b8e4f6c7d9a1b3e5f2c8a4b6d7e9f1c3a5b7d8";

export async function GET(req) {
  const cookieStore = cookies();
  const ownerToken = cookieStore.get("owner_token")?.value;
  const adminToken = cookieStore.get("admin_token")?.value;

  // Early return if no tokens are present
  if (!ownerToken && !adminToken) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let decoded;
    let role;

    // Verify owner token if present
    if (ownerToken) {
      decoded = jwt.verify(ownerToken, JWT_SECRET_OWNER);
      role = decoded.role;
      if (role !== "owner") {
        return Response.json({ error: "Invalid token role" }, { status: 401 });
      }
    }
    // Verify admin token if present
    else if (adminToken) {
      decoded = jwt.verify(adminToken, JWT_SECRET_ADMIN);
      role = decoded.role;
      if (role !== "admin") {
        return Response.json({ error: "Invalid token role" }, { status: 401 });
      }
    }

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