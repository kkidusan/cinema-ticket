"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { sendPasswordResetEmail } from "firebase/auth";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Link from "next/link";
import { auth } from "../lib/firebase-client";

export default function ForgotPassword() {
  const [step, setStep] = useState(0); // 0: CAPTCHA, 1: Email
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [captchaCode, setCaptchaCode] = useState("");
  const [userCaptchaInput, setUserCaptchaInput] = useState("");
  const [captchaColor, setCaptchaColor] = useState("red");
  const [attempts, setAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [useAudioCaptcha, setUseAudioCaptcha] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioPlayCount, setAudioPlayCount] = useState(0);
  const canvasRef = useRef(null);
  const router = useRouter();

  const charSet = "A4B8C6D0E3F7G9H1I5J2KLMNOPQRS$TUVWXZ";
  const colors = ["red", "blue", "green"];
  const maxAttempts = 3;
  const lockoutDuration = 5 * 60 * 1000;
  const minTime = 3000;
  const maxAudioPlays = 3;

  // Generate CAPTCHA code
  const generateCaptchaCode = () => {
    let code = "";
    for (let i = 0; i < 5; i++) {
      code += charSet[Math.floor(Math.random() * charSet.length)];
    }
    return code;
  };

  // Play audio CAPTCHA with noise
  const playAudioCaptcha = () => {
    if (audioPlayCount >= maxAudioPlays) {
      toast.error("Maximum audio plays reached. Refresh CAPTCHA.");
      return;
    }
    setAudioLoading(true);
    setAudioPlayCount((prev) => prev + 1);

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioContext();

    const bufferSize = ctx.sampleRate * 2;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * 0.1;
    }
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    const gainNode = ctx.createGain();
    gainNode.gain.value = 0.05;
    noiseSource.connect(gainNode);
    gainNode.connect(ctx.destination);
    noiseSource.start();

    const utterance = new SpeechSynthesisUtterance(captchaCode.split("").join(" "));
    utterance.rate = 0.8;
    utterance.volume = 1;
    utterance.onend = () => {
      noiseSource.stop();
      ctx.close();
      setAudioLoading(false);
    };
    speechSynthesis.speak(utterance);

    setTimeout(() => {
      if (speechSynthesis.speaking) {
        speechSynthesis.cancel();
        noiseSource.stop();
        ctx.close();
        setAudioLoading(false);
      }
    }, 10000);
  };

  // Draw visual CAPTCHA
  const drawCaptcha = (code) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, "#2d3748");
    gradient.addColorStop(1, "#1a202c");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textBaseline = "middle";
    const charWidth = canvas.width / 6;
    const fonts = ["monospace", "Arial", "Courier New"];

    for (let i = 0; i < code.length; i++) {
      ctx.save();
      const x = i * charWidth + charWidth / 2;
      const y = canvas.height / 2;

      const fontSize = 20 + Math.random() * 8;
      ctx.font = `${fontSize}px ${fonts[Math.floor(Math.random() * fonts.length)]}`;
      const charColor = colors[Math.floor(Math.random() * colors.length)];
      ctx.fillStyle = charColor;

      const warp = Math.sin(i * 0.5 + Math.random()) * 8;
      const shear = (Math.random() - 0.5) * 0.3;
      const angle = (Math.random() - 0.5) * 0.5;
      const scaleX = 0.8 + Math.random() * 0.4;
      const scaleY = 0.8 + Math.random() * 0.4;

      ctx.translate(x, y + warp);
      ctx.rotate(angle);
      ctx.transform(scaleX, shear, 0, scaleY, 0, 0);
      ctx.fillText(code[i], -10, 0);
      ctx.restore();
    }

    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.3 + Math.random() * 0.2})`;
      ctx.lineWidth = 1 + Math.random() * 1;
      ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height);
      ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height);
      ctx.stroke();
    }

    for (let i = 0; i < 2; i++) {
      ctx.beginPath();
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.2 + Math.random() * 0.2})`;
      ctx.lineWidth = 1;
      ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height);
      ctx.quadraticCurveTo(
        Math.random() * canvas.width,
        Math.random() * canvas.height,
        Math.random() * canvas.width,
        Math.random() * canvas.height
      );
      ctx.stroke();
    }

    for (let i = 0; i < 150; i++) {
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.3})`;
      ctx.fillRect(
        Math.random() * canvas.width,
        Math.random() * canvas.height,
        Math.random() * 3,
        Math.random() * 3
      );
    }

    for (let i = 0; i < 4; i++) {
      ctx.save();
      ctx.fillStyle = `rgba(255, 255, 255, ${0.1 + Math.random() * 0.1})`;
      ctx.font = `${16 + Math.random() * 8}px monospace`;
      ctx.translate(
        Math.random() * canvas.width,
        Math.random() * canvas.height
      );
      ctx.rotate((Math.random() - 0.5) * 0.4);
      ctx.fillText(
        charSet[Math.floor(Math.random() * charSet.length)],
        0,
        0
      );
      ctx.restore();
    }

    ctx.filter = "blur(0.6px)";
    ctx.drawImage(canvas, 0, 0);
    ctx.filter = "none";
  };

  // Initialize CAPTCHA
  useEffect(() => {
    if (step === 0) {
      setStartTime(Date.now());
      const newCode = generateCaptchaCode();
      setCaptchaCode(newCode);
      if (!useAudioCaptcha) drawCaptcha(newCode);
      setCaptchaColor(colors[Math.floor(Math.random() * colors.length)]);
      setAudioPlayCount(0);
    }
  }, [step, useAudioCaptcha]);

  // Lockout timer
  useEffect(() => {
    if (lockoutUntil) {
      const timer = setInterval(() => {
        if (Date.now() >= lockoutUntil) {
          setLockoutUntil(null);
          setAttempts(0);
          setError("");
          toast.info("Lockout period ended. Try again.");
        }
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [lockoutUntil]);

  // Validate CAPTCHA input
  const validateCaptcha = () => {
    if (!userCaptchaInput) return "Please enter the CAPTCHA code";
    if (Date.now() - startTime < minTime) return "Please wait a moment before submitting";
    if (lockoutUntil && Date.now() < lockoutUntil)
      return `Too many attempts. Try again in ${Math.ceil(
        (lockoutUntil - Date.now()) / 1000
      )} seconds`;
    const correctCode = captchaCode;
    if (userCaptchaInput !== correctCode) return "Incorrect CAPTCHA code";
    return "";
  };

  // Handle CAPTCHA verification
  const handleVerifyCaptcha = (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const captchaError = validateCaptcha();
    if (captchaError) {
      setAttempts((prev) => prev + 1);
      if (attempts + 1 >= maxAttempts) {
        const lockoutTime = Date.now() + lockoutDuration;
        setLockoutUntil(lockoutTime);
        setError(`Too many attempts. Locked out for 5 minutes.`);
        toast.error(`Too many attempts. Locked out for 5 minutes.`);
        return;
      }
      setError(captchaError);
      toast.error(captchaError);
      refreshCaptcha();
      return;
    }

    setSuccess("CAPTCHA verified!");
    toast.success("CAPTCHA verified!");
    setStep(1);
    setUserCaptchaInput("");
    setAttempts(0);
    setLockoutUntil(null);
  };

  // Refresh CAPTCHA
  const refreshCaptcha = () => {
    const newCode = generateCaptchaCode();
    setCaptchaCode(newCode);
    if (!useAudioCaptcha) drawCaptcha(newCode);
    setCaptchaColor(colors[Math.floor(Math.random() * colors.length)]);
    setUserCaptchaInput("");
    setError("");
    setSuccess("");
    setAudioPlayCount(0);
  };

  // Toggle CAPTCHA type
  const toggleCaptchaType = () => {
    setUseAudioCaptcha(!useAudioCaptcha);
    setUserCaptchaInput("");
    setError("");
    setSuccess("");
    setAudioPlayCount(0);
  };

  // Validate email
  const validateEmail = () => {
    if (!email) return "Email is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Invalid email format";
    return "";
  };

  // Handle sending password reset email
  const handleSendEmail = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const emailError = validateEmail();
    if (emailError) {
      setError(emailError);
      toast.error(emailError);
      return;
    }

    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email, {
        url: `${window.location.origin}/`,
        handleCodeInApp: true,
      });
      setSuccess("Password reset link sent to your email!");
      toast.success("Password reset link sent to your email!");
      setTimeout(() => router.push("/"), 3000);
    } catch (err) {
      console.error("Send email error:", err);
      const errorMessages = {
        "auth/user-not-found": "No account found with this email.",
        "auth/invalid-email": "Invalid email format.",
        "auth/too-many-requests": "Too many attempts. Please wait a few minutes and try again.",
      };
      const message = errorMessages[err.code] || "Failed to send reset email. Please try again.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4 sm:p-6">
      <ToastContainer position="top-center" autoClose={3000} theme="dark" />
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-3xl shadow-2xl overflow-hidden border border-gray-700">
          <div className="p-6 sm:p-8">
            {/* Progress Bar */}
            <div className="flex justify-between mb-6">
              {["Verify", "Email"].map((label, index) => (
                <div key={index} className="flex-1 text-center">
                  <motion.div
                    className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center text-sm font-semibold ${
                      step >= index ? "bg-blue-500 text-white" : "bg-gray-600 text-gray-400"
                    }`}
                    animate={{ scale: step === index ? 1.1 : 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    {index + 1}
                  </motion.div>
                  <p className="text-xs text-gray-400 mt-1">{label}</p>
                </div>
              ))}
            </div>

            <motion.div
              className="flex items-center justify-center mb-6"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className="relative">
                <span className="text-2xl font-bold text-white tracking-tight">
                  {step === 0 ? "Verify You're Human" : "Forgot Password"}
                </span>
                <div className="absolute -bottom-2 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full" />
              </div>
            </motion.div>

            <AnimatePresence>
              {error && (
                <motion.p
                  className="flex items-center text-red-400 text-sm text-center mb-4"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <AlertCircle className="h-4 w-4 mr-2" />
                  {error}
                </motion.p>
              )}
              {success && (
                <motion.p
                  className="flex items-center text-green-400 text-sm text-center mb-4"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  {success}
                </motion.p>
              )}
            </AnimatePresence>

            {step === 0 && (
              <form onSubmit={handleVerifyCaptcha} className="space-y-5">
                <div className="flex flex-col items-center">
                  {!useAudioCaptcha && (
                    <>
                      <canvas
                        ref={canvasRef}
                        width="200"
                        height="60"
                        className="border border-gray-600 rounded-lg mb-2"
                        onContextMenu={(e) => e.preventDefault()}
                        draggable={false}
                        aria-label="CAPTCHA image"
                      />
                      <p className="text-sm text-gray-300 mb-2 text-center">
                        Enter only the <span className={`text-${captchaColor}-400 font-semibold`}>{captchaColor}</span> characters
                      </p>
                    </>
                  )}
                  {useAudioCaptcha && (
                    <button
                      type="button"
                      onClick={playAudioCaptcha}
                      disabled={audioLoading || audioPlayCount >= maxAudioPlays}
                      className="mb-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center transition-colors"
                      aria-label="Play audio CAPTCHA"
                    >
                      {audioLoading ? (
                        <svg
                          className="animate-spin h-5 w-5 mr-2"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                          />
                        </svg>
                      ) : (
                        <Volume2 className="h-5 w-5 mr-2" />
                      )}
                      {audioLoading ? "Loading..." : "Play Audio CAPTCHA"}
                    </button>
                  )}
                  <div className="flex items-center justify-between w-full mb-2">
                    <button
                      type="button"
                      onClick={refreshCaptcha}
                      className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
                      title="Generate a new CAPTCHA"
                      aria-label="Refresh CAPTCHA"
                    >
                      Refresh CAPTCHA
                    </button>
                    <button
                      type="button"
                      onClick={toggleCaptchaType}
                      className="text-blue-400 hover:text-blue-300 text-sm flex items-center transition-colors"
                      title={useAudioCaptcha ? "Switch to visual CAPTCHA" : "Switch to audio CAPTCHA"}
                      aria-label={useAudioCaptcha ? "Use visual CAPTCHA" : "Use audio CAPTCHA"}
                    >
                      <Volume2 className="h-4 w-4 mr-1" />
                      {useAudioCaptcha ? "Visual CAPTCHA" : "Audio CAPTCHA"}
                    </button>
                  </div>
                  <input
                    type="text"
                    value={userCaptchaInput}
                    onChange={(e) => {
                      setUserCaptchaInput(e.target.value);
                      setError("");
                      setSuccess("");
                    }}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder-gray-400"
                    placeholder={useAudioCaptcha ? "Enter audio code" : "Enter the code above"}
                    required
                    aria-label="CAPTCHA input"
                    autoFocus
                  />
                </div>
                <motion.button
                  type="submit"
                  disabled={loading || (lockoutUntil && Date.now() < lockoutUntil)}
                  className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl text-white font-semibold hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 transition-all flex items-center justify-center"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  aria-label="Verify CAPTCHA"
                >
                  {loading ? (
                    <span className="flex items-center">
                      <svg
                        className="animate-spin h-5 w-5 mr-2"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      Verifying...
                    </span>
                  ) : (
                    "Verify CAPTCHA"
                  )}
                </motion.button>
              </form>
            )}

            {step === 1 && (
              <form onSubmit={handleSendEmail} className="space-y-5">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-300 mb-1"
                  >
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError("");
                      setSuccess("");
                    }}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder-gray-400"
                    placeholder="you@example.com"
                    required
                    aria-label="Email address"
                    autoFocus
                  />
                </div>
                <motion.button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl text-white font-semibold hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 transition-all flex items-center justify-center"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  aria-label="Send reset email"
                >
                  {loading ? (
                    <span className="flex items-center">
                      <svg
                        className="animate-spin h-5 w-5 mr-2"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      Sending...
                    </span>
                  ) : (
                    "Send Reset Email"
                  )}
                </motion.button>
              </form>
            )}

            <div className="text-center mt-4">
              <Link
                href="/login"
                className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
                aria-label="Back to login"
              >
                Back to Log In
              </Link>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}