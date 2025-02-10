"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, reauthenticateWithCredential, EmailAuthProvider, updatePassword } from "firebase/auth";
import { auth as firebaseAuth } from "../../../firebaseconfig";
import { Eye, EyeOff } from "lucide-react";

export default function AboutPage() {
  const [userEmail, setUserEmail] = useState(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [errors, setErrors] = useState([]);
  const [success, setSuccess] = useState("");
  const router = useRouter();

  useEffect(() => {
    const user = firebaseAuth.currentUser;
    if (!user) {
      router.push("/login");
    } else {
      setUserEmail(user.email);
    }
  }, [router]);

  const validatePassword = (password) => {
    const errorMessages = [];
    if (password.length < 8) errorMessages.push("Password must be at least 8 characters long");
    if (!/[A-Z]/.test(password)) errorMessages.push("Password must contain at least one uppercase letter");
    if (!/[a-z]/.test(password)) errorMessages.push("Password must contain at least one lowercase letter");
    if (!/[0-9]/.test(password)) errorMessages.push("Password must contain at least one number");
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) errorMessages.push("Password must contain at least one special character");
    return errorMessages;
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setErrors([]);
    setSuccess("");

    const validationErrors = validatePassword(newPassword);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    const user = firebaseAuth.currentUser;
    if (!user) {
      setErrors(["User is not authenticated."]);
      return;
    }

    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      setSuccess("Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
    } catch (error) {
      setErrors([error.message]);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-lg text-center">
        <h2 className="text-2xl font-bold text-gray-800">Change Password</h2>
        <p className="text-gray-600 mt-4">User: {userEmail ? userEmail : "Loading..."}</p>

        <form onSubmit={handlePasswordChange} className="mt-8">
          {/* Current Password Field */}
          <div className="mb-4 relative">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="currentPassword">
              Current Password
            </label>
            <input
              id="currentPassword"
              type={showCurrentPassword ? "text" : "password"}
              placeholder="Enter your current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full p-3 pr-10 border rounded-lg focus:outline-none focus:ring focus:ring-blue-300"
            />
            <div
              className="absolute inset-y-0 right-3 pt-7 flex items-center cursor-pointer"
              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
            >
              {showCurrentPassword ? <EyeOff className="text-gray-500 w-5 h-5" /> : <Eye className="text-gray-500 w-5 h-5" />}
            </div>
          </div>

          {/* New Password Field */}
          <div className="mb-4 relative">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="newPassword">
              New Password
            </label>
            <input
              id="newPassword"
              type={showNewPassword ? "text" : "password"}
              placeholder="Enter your new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full p-3 pr-10 border rounded-lg focus:outline-none focus:ring focus:ring-blue-300"
            />
            <div
              className="absolute inset-y-0 right-3 pt-7 flex items-center cursor-pointer"
              onClick={() => setShowNewPassword(!showNewPassword)}
            >
              {showNewPassword ? <EyeOff className="text-gray-500 w-5 h-5" /> : <Eye className="text-gray-500 w-5 h-5" />}
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring focus:ring-blue-300"
          >
            Change Password
          </button>
        </form>

        {/* Display Errors */}
        {errors.length > 0 && (
          <div className="mt-4 bg-red-100 text-red-700 p-3 rounded-lg">
            <ul className="list-disc list-inside">
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Display Success Message */}
        {success && <p className="text-green-500 mt-4">{success}</p>}
      </div>
    </div>
  );
}
