import { getAuth } from "firebase-admin/auth";
import { initializeApp, applicationDefault } from "firebase-admin/app";

// Initialize Firebase Admin SDK
initializeApp({
  credential: applicationDefault(),
});

export async function verifyIdToken(token) {
  const auth = getAuth();
  const decodedToken = await auth.verifyIdToken(token);
  return decodedToken;
}
