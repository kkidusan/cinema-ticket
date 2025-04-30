"use client";

import { useState, useEffect, useContext } from "react";
import { db, auth } from "../firebaseconfig";
import { createUserWithEmailAndPassword, sendEmailVerification, signInWithEmailAndPassword } from "firebase/auth";
import { collection, addDoc } from "firebase/firestore";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import { Loader2, Mail, User, Lock, MapPin, FileText, Eye, EyeOff, CheckCircle, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ThemeContext } from "../context/ThemeContext";

// Types
interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  location: string;
  phoneNumber: string;
  tradeCertificate: string;
  countryCode: string;
}

interface Errors {
  [key: string]: string | undefined;
  general?: string;
}

interface PasswordValidation {
  minLength: boolean;
  uppercase: boolean;
  number: boolean;
  specialChar: boolean;
}

export default function RegisterForm() {
  const [formData, setFormData] = useState<FormData>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    location: "",
    phoneNumber: "",
    tradeCertificate: "",
    countryCode: "+251",
  });
  const [errors, setErrors] = useState<Errors>({});
  const [passwordValidation, setPasswordValidation] = useState<PasswordValidation>({
    minLength: false,
    uppercase: false,
    number: false,
    specialChar: false,
  });
  const [showPasswordErrors, setShowPasswordErrors] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [verificationSent, setVerificationSent] = useState<boolean>(false);
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const router = useRouter();
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("ThemeContext must be used within a ThemeProvider");
  }
  const { theme } = context;

  // Check email verification status
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (verificationSent && auth.currentUser) {
      interval = setInterval(async () => {
        try {
          await auth.currentUser.reload();
          if (auth.currentUser.emailVerified) {
            setVerificationStatus("verified");
            clearInterval(interval);
            completeRegistration(auth.currentUser.uid);
          }
        } catch (error: any) {
          setErrors({ general: "Error checking verification status. Please try again." });
        }
      }, 10000);
    }
    return () => clearInterval(interval);
  }, [verificationSent]);

  // Handle resend cooldown
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Email validation (from LoginPage)
  const validateEmail = (email: string): boolean => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  // Password validation (from LoginPage)
  const validatePassword = (password: string): PasswordValidation => {
    return {
      minLength: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      number: /[0-9]/.test(password),
      specialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };
  };

  const getPasswordErrors = (validation: PasswordValidation): string[] => {
    const errors: string[] = [];
    if (!validation.minLength) errors.push("Password must be at least 8 characters long");
    if (!validation.uppercase) errors.push("Password must contain at least one uppercase letter");
    if (!validation.number) errors.push("Password must contain at least one number");
    if (!validation.specialChar) errors.push("Password must contain at least one special character");
    return errors;
  };

  const validateForm = () => {
    const newErrors: Errors = {};
    if (!formData.firstName.trim()) newErrors.firstName = "First name is required.";
    if (!formData.lastName.trim()) newErrors.lastName = "Last name is required.";
    if (!formData.email) newErrors.email = "Email is required.";
    else if (!validateEmail(formData.email)) newErrors.email = "Invalid email format.";
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

    if (!formData.password) newErrors.password = "Password is required.";
    else {
      const pwdValidation = validatePassword(formData.password);
      setPasswordValidation(pwdValidation);
      const pwdErrors = getPasswordErrors(pwdValidation);
      if (pwdErrors.length > 0) {
        newErrors.password = "Password does not meet requirements.";
        setShowPasswordErrors(true);
      } else {
        setShowPasswordErrors(false);
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, field: keyof FormData) => {
    const value = e.target.value;
    setFormData({ ...formData, [field]: value });
    setErrors({ ...errors, [field]: "", general: "" });
    if (field === "password") {
      setShowPasswordErrors(false);
      const validation = validatePassword(value);
      setPasswordValidation(validation);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && ["application/pdf", "image/jpeg", "image/png"].includes(file.type)) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, tradeCertificate: reader.result as string });
        setErrors({ ...errors, tradeCertificate: "", general: "" });
      };
      reader.readAsDataURL(file);
    } else {
      setErrors({ ...errors, tradeCertificate: "Please select a valid PDF, JPG, or PNG file.", general: "" });
    }
  };

  const handlePhoneChange = (value: string, country: any) => {
    const rawNumber = value.replace(/^\+?[0-9]{1,3}/, "");
    setFormData({
      ...formData,
      phoneNumber: rawNumber,
      countryCode: `+${country.dialCode}`,
    });
    setErrors({ ...errors, phoneNumber: "", general: "" });
  };

  const completeRegistration = async (userId: string) => {
    try {
      await addDoc(collection(db, "owner"), {
        uid: userId,
        ...formData,
        phoneNumber: formData.countryCode + formData.phoneNumber,
        role: "owner",
        approvedDate: new Date().toISOString(),
        approved: false,
      });

      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        location: "",
        phoneNumber: "",
        tradeCertificate: "",
        countryCode: "+251",
      });
      setErrors({});
      setPasswordValidation({ minLength: false, uppercase: false, number: false, specialChar: false });
      setShowPasswordErrors(false);
      setVerificationSent(false);
      setVerificationStatus(null);
      router.push("/login");
    } catch (error: any) {
      setErrors({ general: "Failed to save registration data. Please try again or contact support." });
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
    } catch (error: any) {
      let errorMessage = "Failed to resend verification email. Please try again.";
      if (error.code === "auth/too-many-requests") {
        errorMessage = "Too many attempts. Please try again later.";
        setResendCooldown(60);
      } else if (error.code === "auth/missing-email") {
        errorMessage = "No email associated with this account. Please register again.";
        setVerificationSent(false);
      }
      setErrors({ general: errorMessage });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      await sendEmailVerification(userCredential.user, {
        url: `${window.location.origin}/login`,
      });
      setVerificationSent(true);
    } catch (error: any) {
      let errorMessage = "Registration failed. Please try again.";
      if (error.code === "auth/invalid-email") {
        errorMessage = "Invalid email format.";
      } else if (error.code === "auth/email-already-in-use") {
        try {
          const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password);
          await userCredential.user.reload();
          if (!userCredential.user.emailVerified) {
            await sendEmailVerification(userCredential.user, {
              url: `${window.location.origin}/login`,
            });
            setVerificationSent(true);
            setErrors({ general: "Verification email resent. Please check your inbox and spam folder." });
            setResendCooldown(30);
          } else {
            errorMessage = "This email is already registered and verified. Please log in.";
          }
        } catch (signInError: any) {
          if (signInError.code === "auth/wrong-password") {
            errorMessage = "This email is already registered. Please use the correct password or try a different email.";
          } else {
            errorMessage = "This email is already registered. Please try a different email.";
          }
        }
      } else if (error.code === "auth/weak-password") {
        errorMessage = "Password is too weak.";
      } else if (error.code === "auth/too-many-requests") {
        errorMessage = "Too many attempts. Please try again later.";
      }
      setErrors({ general: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const inputFields = [
    { name: "firstName", type: "text", placeholder: "First Name", icon: User, label: "First Name", showValidation: false },
    { name: "lastName", type: "text", placeholder: "Last Name", icon: User, label: "Last Name", showValidation: false },
    { name: "email", type: "email", placeholder: "Email", icon: Mail, label: "Email", showValidation: true },
    { name: "password", type: "password", placeholder: "Password", icon: Lock, label: "Password", showToggle: true, showValidation: true },
    { name: "location", type: "text", placeholder: "Location", icon: MapPin, label: "Location", showValidation: false },
  ];

  return (
    <main className={`min-h-screen flex items-center justify-center p-6 ${theme === "light" ? "bg-zinc-100" : "bg-zinc-900"}`}>
      <motion.div
        className={`w-full max-w-2xl rounded-2xl shadow-lg overflow-hidden ${
          theme === "light" ? "bg-gradient-to-br from-blue-50 to-purple-50" : "bg-gradient-to-br from-gray-800 to-gray-900"
        }`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="p-8">
          <h2
            className={`text-3xl font-bold text-center ${theme === "light" ? "text-zinc-800" : "text-zinc-100"} mb-6`}
          >
            Create Your Account
          </h2>

          {errors.general && (
            <motion.div
              className="mb-6 p-4 rounded-lg bg-red-100 text-red-700"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              {errors.general}
            </motion.div>
          )}

          {verificationSent ? (
            <div className="text-center">
              <h3
                className={`text-xl font-semibold ${theme === "light" ? "text-zinc-700" : "text-zinc-300"} mb-4`}
              >
                {verificationStatus === "verified" ? "Email Verified!" : "Verify Your Email"}
              </h3>
              {verificationStatus === "verified" ? (
                <p className="text-green-600">Your email has been verified. Completing registration...</p>
              ) : (
                <>
                  <p className={`text-sm ${theme === "light" ? "text-zinc-600" : "text-zinc-400"} mb-4`}>
                    A verification email has been sent to <strong>{formData.email}</strong>. Please check your inbox (and spam folder) and click the link to verify your email.
                  </p>
                  <motion.button
                    onClick={resendVerificationEmail}
                    className={`px-4 py-2 bg-blue-600 text-white rounded-lg font-medium ${
                      resendCooldown > 0 ? "opacity-50 cursor-not-allowed" : "hover:bg-blue-700"
                    }`}
                    disabled={resendCooldown > 0}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Verification Email"}
                  </motion.button>
                </>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {inputFields.map(({ name, type, placeholder, icon: Icon, label, showToggle, showValidation }) => (
                <motion.div
                  key={name}
                  className={`p-4 rounded-xl shadow-sm ${
                    theme === "light"
                      ? "bg-gradient-to-br from-blue-100 to-purple-100"
                      : "bg-gradient-to-br from-gray-700 to-gray-800"
                  }`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + inputFields.indexOf(inputFields.find((f) => f.name === name)!) * 0.1, duration: 0.4 }}
                >
                  <label
                    htmlFor={name}
                    className={`block text-sm font-medium ${theme === "light" ? "text-zinc-700" : "text-zinc-300"} mb-1`}
                  >
                    {label}
                  </label>
                  <div className="relative">
                    <input
                      type={showToggle ? (showPassword ? "text" : "password") : type}
                      id={name}
                      name={name}
                      placeholder={placeholder}
                      value={formData[name as keyof FormData]}
                      onChange={(e) => handleInputChange(e, name as keyof FormData)}
                      className={`w-full p-3 pl-10 ${showToggle ? "pr-10" : ""} border ${
                        theme === "light" ? "border-zinc-200" : "border-zinc-700"
                      } rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        theme === "light" ? "bg-white" : "bg-gray-800"
                      } ${
                        errors[name] || (name === "password" && showPasswordErrors)
                          ? "border-red-500"
                          : name === "email" && formData.email && validateEmail(formData.email)
                          ? "border-green-500"
                          : name === "password" &&
                            passwordValidation.minLength &&
                            passwordValidation.uppercase &&
                            passwordValidation.number &&
                            passwordValidation.specialChar
                          ? "border-green-500"
                          : ""
                      }`}
                      aria-describedby={errors[name] || (name === "password" && showPasswordErrors) ? `${name}-error` : undefined}
                      required
                    />
                    <Icon
                      className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${
                        theme === "light" ? "text-zinc-500" : "text-zinc-400"
                      } w-5 h-5`}
                    />
                    {showValidation && name === "email" && formData.email && (
                      <motion.div
                        className="absolute inset-y-0 right-3 flex items-center"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.2 }}
                      >
                        {validateEmail(formData.email) ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-500" />
                        )}
                      </motion.div>
                    )}
                    {showToggle && (
                      <button
                        type="button"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        onClick={() => setShowPassword(!showPassword)}
                        className={`absolute inset-y-0 right-3 flex items-center hover:bg-gray-200/50 rounded-full p-1 transition-colors ${
                          theme === "light" ? "text-zinc-500" : "text-zinc-400"
                        }`}
                      >
                        {showPassword ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    )}
                  </div>
                  {errors[name] && name !== "password" && (
                    <p id={`${name}-error`} className="text-red-500 text-sm mt-1">
                      {errors[name]}
                    </p>
                  )}
                  {name === "password" && showPasswordErrors && (
                    <motion.div
                      className="mt-2 p-3 rounded-lg bg-red-100 text-red-700"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.3 }}
                    >
                      <ul className="space-y-1 text-sm">
                        <li className="flex items-center">
                          {passwordValidation.minLength ? (
                            <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500 mr-2" />
                          )}
                          At least 8 characters
                        </li>
                        <li className="flex items-center">
                          {passwordValidation.uppercase ? (
                            <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500 mr-2" />
                          )}
                          At least one uppercase letter
                        </li>
                        <li className="flex items-center">
                          {passwordValidation.number ? (
                            <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500 mr-2" />
                          )}
                          At least one number
                        </li>
                        <li className="flex items-center">
                          {passwordValidation.specialChar ? (
                            <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500 mr-2" />
                          )}
                          At least one special character
                        </li>
                      </ul>
                    </motion.div>
                  )}
                </motion.div>
              ))}

              <motion.div
                className={`p-4 rounded-xl shadow-sm col-span-1 sm:col-span-2 ${
                  theme === "light"
                    ? "bg-gradient-to-br from-blue-100 to-purple-100"
                    : "bg-gradient-to-br from-gray-700 to-gray-800"
                }`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7, duration: 0.4 }}
              >
                <label
                  className={`block text-sm font-medium ${theme === "light" ? "text-zinc-700" : "text-zinc-300"} mb-1`}
                >
                  Phone Number
                </label>
                <PhoneInput
                  country={"et"}
                  value={formData.countryCode + formData.phoneNumber}
                  onChange={handlePhoneChange}
                  enableSearch={true}
                  inputClass={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    theme === "light" ? "bg-white border-zinc-200" : "bg-gray-800 border-zinc-700"
                  } ${errors.phoneNumber ? "border-red-500" : ""}`}
                  buttonClass={`border ${theme === "light" ? "border-zinc-200" : "border-zinc-700"}`}
                />
                {errors.phoneNumber && (
                  <p className="text-red-500 text-sm mt-1">{errors.phoneNumber}</p>
                )}
              </motion.div>

              <motion.div
                className={`p-4 rounded-xl shadow-sm col-span-1 sm:col-span-2 ${
                  theme === "light"
                    ? "bg-gradient-to-br from-blue-100 to-purple-100"
                    : "bg-gradient-to-br from-gray-700 to-gray-800"
                }`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.4 }}
              >
                <label
                  htmlFor="tradeCertificate"
                  className={`block text-sm font-medium ${theme === "light" ? "text-zinc-700" : "text-zinc-300"} mb-1`}
                >
                  Trade Certificate
                </label>
                <div className="relative">
                  <input
                    type="file"
                    id="tradeCertificate"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileChange}
                    className={`w-full p-3 pl-10 border ${
                      theme === "light" ? "border-zinc-200" : "border-zinc-700"
                    } rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      theme === "light" ? "bg-white" : "bg-gray-800"
                    } ${errors.tradeCertificate ? "border-red-500" : ""}`}
                    aria-describedby={errors.tradeCertificate ? "tradeCertificate-error" : undefined}
                    required
                  />
                  <FileText
                    className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${
                      theme === "light" ? "text-zinc-500" : "text-zinc-400"
                    } w-5 h-5`}
                  />
                </div>
                {errors.tradeCertificate && (
                  <p id="tradeCertificate-error" className="text-red-500 text-sm mt-1">
                    {errors.tradeCertificate}
                  </p>
                )}
              </motion.div>

              <motion.button
                type="submit"
                disabled={isLoading || !validateEmail(formData.email)}
                className={`col-span-1 sm:col-span-2 w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-lg shadow-md ${
                  isLoading || !validateEmail(formData.email)
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:from-blue-700 hover:to-purple-700"
                } transition-all flex items-center justify-center`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin mr-2" size={20} />
                    Registering...
                  </>
                ) : (
                  "Register"
                )}
              </motion.button>
            </form>
          )}

          <div className="mt-6 text-center">
            <p className={`text-sm ${theme === "light" ? "text-zinc-600" : "text-zinc-400"}`}>
              Already have an account?{" "}
              <Link
                href="/login"
                className={`underline ${theme === "light" ? "text-blue-600" : "text-blue-400"} hover:text-blue-500`}
              >
                Log In
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </main>
  );
}