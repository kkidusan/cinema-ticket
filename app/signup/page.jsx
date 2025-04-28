"use client";

import { useState, useEffect } from "react";
import { db, auth } from "../firebaseconfig";
import { createUserWithEmailAndPassword, sendEmailVerification, signInWithEmailAndPassword } from "firebase/auth";
import { collection, addDoc } from "firebase/firestore";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { FiUser, FiMail, FiLock, FiMapPin, FiCheck, FiX, FiFileText } from "react-icons/fi";
import { motion } from "framer-motion";
import Link from "next/link";

export default function RegisterForm() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    password: "",
    location: "",
    phoneNumber: "",
    tradeCertificate: "",
    countryCode: "+251",
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const router = useRouter();

  // Check email verification status
  useEffect(() => {
    let interval;
    if (verificationSent && auth.currentUser) {
      interval = setInterval(async () => {
        try {
          await auth.currentUser.reload();
          if (auth.currentUser.emailVerified) {
            setVerificationStatus("verified");
            clearInterval(interval);
            completeRegistration(auth.currentUser.uid);
          }
        } catch (error) {
          setErrors({ general: "Error checking verification status. Please try again." });
        }
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [verificationSent]);

  // Handle resend cooldown
  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const validateForm = () => {
    let newErrors = {};
    if (!formData.firstName.trim()) newErrors.firstName = "First name is required.";
    if (!formData.lastName.trim()) newErrors.lastName = "Last name is required.";
    if (!formData.username.trim()) newErrors.username = "Username is required.";
    if (!formData.email.match(/^[\w-]+@([\w-]+\.)+[\w-]{2,4}$/)) newErrors.email = "Invalid email format.";
    if (formData.password.length < 8) newErrors.password = "Password must be at least 8 characters.";
    if (!formData.location.trim()) newErrors.location = "Location is required.";
    if (!formData.tradeCertificate) newErrors.tradeCertificate = "Trade certificate file is required.";

    if (formData.countryCode === "+251") {
      const ethiopianRegex = /^9\d{8}$/;
      if (!ethiopianRegex.test(formData.phoneNumber)) {
        newErrors.phoneNumber = "Phone number must be 9 digits and start with +2519.";
      }
    } else if (!formData.phoneNumber.match(/^\d{7,15}$/)) {
      newErrors.phoneNumber = "Invalid phone number for the selected country.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setErrors({ ...errors, [name]: "" });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && ["application/pdf", "image/jpeg", "image/png"].includes(file.type)) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, tradeCertificate: reader.result });
        setErrors({ ...errors, tradeCertificate: "" });
      };
      reader.readAsDataURL(file);
    } else {
      setErrors({ ...errors, tradeCertificate: "Please select a valid PDF, JPG, or PNG file." });
    }
  };

  const handlePhoneChange = (value, country) => {
    const rawNumber = value.replace(/^\+?[0-9]{1,3}/, "");
    setFormData({
      ...formData,
      phoneNumber: rawNumber,
      countryCode: `+${country.dialCode}`,
    });
    setErrors({ ...errors, phoneNumber: "" });
  };

  const completeRegistration = async (userId) => {
    try {
      await addDoc(collection(db, "owner"), {
        uid: userId,
        ...formData,
        phoneNumber: formData.countryCode + formData.phoneNumber,
        role: "owner",
        approvedDate: new Date(),
        approved: false,
      });

      setFormData({
        firstName: "",
        lastName: "",
        username: "",
        email: "",
        password: "",
        location: "",
        phoneNumber: "",
        tradeCertificate: "",
        countryCode: "+251",
      });
      setErrors({});
      setVerificationSent(false);
      setVerificationStatus(null);

      router.push("/login");
    } catch (error) {
      setErrors({
        general: "Failed to save registration data. Please try again or contact support.",
      });
      setIsLoading(false);
    }
  };

  const resendVerificationEmail = async () => {
    if (resendCooldown > 0) {
      setErrors({ general: `Please wait ${resendCooldown} seconds before resending.` });
      return;
    }

    if (!auth.currentUser) {
      setErrors({ general: "User session expired. Please try registering again." });
      setVerificationSent(false);
      return;
    }

    try {
      await sendEmailVerification(auth.currentUser, {
        url: `${window.location.origin}/login`,
      });
      setErrors({ general: "Verification email resent. Please check your inbox and spam folder." });
      setResendCooldown(30);
    } catch (error) {
      let errorMessage = "Failed to resend verification email. Please try again.";
      if (error.code === "auth/too-many-requests") {
        errorMessage = "Too many requests. Please wait a moment before trying again.";
        setResendCooldown(60);
      } else if (error.code === "auth/missing-email") {
        errorMessage = "No email associated with this account. Please register again.";
        setVerificationSent(false);
      }
      setErrors({ general: errorMessage });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      await sendEmailVerification(userCredential.user, {
        url: `${window.location.origin}/login`,
      });
      setVerificationSent(true);
      setIsLoading(false);
    } catch (error) {
      if (error.code === "auth/email-already-in-use") {
        try {
          // Attempt to sign in to check if email is verified
          const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password);
          await userCredential.user.reload();
          if (!userCredential.user.emailVerified) {
            // Email exists but is not verified, resend verification email
            await sendEmailVerification(userCredential.user, {
              url: `${window.location.origin}/login`,
            });
            setVerificationSent(true);
            setErrors({ general: "Verification email resent. Please check your inbox and spam folder." });
            setResendCooldown(30);
          } else {
            // Email is already verified
            setErrors({
              general: "This email is already registered and verified. Please log in.",
            });
          }
        } catch (signInError) {
          setErrors({
            general: "This email is already registered. Please use the correct password or try a different email.",
          });
        }
      } else {
        let errorMessage = "Registration failed. Please try again.";
        if (error.code === "auth/invalid-email") {
          errorMessage = "Invalid email format.";
        }
        setErrors({ general: errorMessage });
      }
      setIsLoading(false);
    }
  };

  const inputFields = [
    { name: "firstName", type: "text", placeholder: "First Name", icon: FiUser },
    { name: "lastName", type: "text", placeholder: "Last Name", icon: FiUser },
    { name: "username", type: "text", placeholder: "Username", icon: FiUser },
    { name: "email", type: "email", placeholder: "Email", icon: FiMail },
    { name: "password", type: "password", placeholder: "Password", icon: FiLock },
    { name: "location", type: "text", placeholder: "Location", icon: FiMapPin },
  ];

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-100 to-purple-100 p-6">
      <motion.div
        className="w-full max-w-2xl rounded-2xl shadow-xl hover:shadow-2xl transition-shadow p-8 bg-white"
        whileHover={{ scale: 1.02 }}
        animate={Object.keys(errors).length ? { x: [-10, 10, -10, 10, 0] } : {}}
        transition={{ type: "spring", stiffness: 300 }}
      >
        <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">Create Your Account</h2>

        {errors.general && (
          <div id="error-message" className="mb-4 p-3 bg-red-100 text-red-600 rounded-lg text-sm text-center">
            {errors.general}
          </div>
        )}

        {verificationSent ? (
          <div className="text-center">
            <h3 className="text-xl font-semibold text-gray-700 mb-4">
              {verificationStatus === "verified" ? "Email Verified!" : "Verify Your Email"}
            </h3>
            {verificationStatus === "verified" ? (
              <p className="text-green-600">Your email has been verified. Completing registration...</p>
            ) : (
              <>
                <p className="text-gray-600 mb-4">
                  A verification email has been sent to <strong>{formData.email}</strong>. Please check your inbox (and spam folder) and click the link to verify your email.
                </p>
                <button
                  onClick={resendVerificationEmail}
                  className={`bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-all ${resendCooldown > 0 ? "opacity-50 cursor-not-allowed" : ""}`}
                  disabled={resendCooldown > 0}
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Verification Email"}
                </button>
              </>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {inputFields.map(({ name, type, placeholder, icon: Icon }) => (
              <div key={name} className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Icon className="text-gray-400" />
                </div>
                <input
                  type={type}
                  name={name}
                  placeholder={placeholder}
                  value={formData[name]}
                  onChange={handleChange}
                  className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${errors[name] ? "border-red-500" : "border-gray-300"}`}
                  aria-describedby={errors[name] ? `${name}-error` : undefined}
                />
                {formData[name] && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    {errors[name] ? <FiX className="text-red-500" /> : <FiCheck className="text-green-500" />}
                  </div>
                )}
                {errors[name] && (
                  <p id={`${name}-error`} className="text-red-500 text-sm mt-1">{errors[name]}</p>
                )}
              </div>
            ))}

            <div className="col-span-1 sm:col-span-2">
              <label className="block text-gray-700 font-semibold mb-1">Phone Number</label>
              <PhoneInput
                country={"et"}
                value={formData.countryCode + formData.phoneNumber}
                onChange={handlePhoneChange}
                enableSearch={true}
                inputClass={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.phoneNumber ? "border-red-500" : "border-gray-300"}`}
                buttonClass="border-gray-300"
              />
              {errors.phoneNumber && <p className="text-red-500 text-sm mt-1">{errors.phoneNumber}</p>}
            </div>

            <div className="col-span-1 sm:col-span-2 relative">
              <label className="block text-gray-700 font-semibold mb-1">Trade Certificate</label>
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none top-8">
                <FiFileText className="text-gray-400" />
              </div>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                className={`w-full pl-10 p-2 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 ${errors.tradeCertificate ? "border-red-500" : "border-gray-300"}`}
              />
              {errors.tradeCertificate && (
                <p className="text-red-500 text-sm mt-1">{errors.tradeCertificate}</p>
              )}
            </div>

            <button
              type="submit"
              className="col-span-1 sm:col-span-2 w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 transition-all transform hover:scale-105 disabled:opacity-50 flex items-center justify-center"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin mr-2" size={20} />
                  Registering...
                </>
              ) : (
                "Register"
              )}
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{" "}
            <Link href="/login" className="text-blue-500 hover:text-blue-600 hover:underline transition-all">
              Log In
            </Link>
          </p>
        </div>
      </motion.div>
    </main>
  );
}