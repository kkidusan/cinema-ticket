"use client"

import { useEffect } from "react";
import { auth } from "../firebaseconfig";
import { useRouter } from "next/navigation";

export default function VerifySuccess() {
  const router = useRouter();

  useEffect(() => {
    const checkVerification = async () => {
      if (auth.currentUser) {
        await auth.currentUser.reload();
        if (auth.currentUser.emailVerified) {
          // Call completeRegistration or redirect to a success page
          router.push("/registration-complete");
        } else {
          router.push("/");
        }
      } else {
        router.push("/signup");
      }
    };
    checkVerification();
  }, []);

  return <div>Verifying your email...</div>;
}