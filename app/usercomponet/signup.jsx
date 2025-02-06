// pages/signup.js
"use client"; // Ensure this is a client component
import { useState } from "react";
import { auth, db } from "../firebaseconfig";
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation"; // Use next/navigation for Next.js 13

const Signup = () => {
    const [email, setEmail] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [age, setAge] = useState("");
    const [location, setLocation] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isVerified, setIsVerified] = useState(false);
    const router = useRouter();

    const handleSignup = async (e) => {
        e.preventDefault();
        setError("");

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            await sendEmailVerification(userCredential.user);
            alert("Verification email sent! Please check your inbox.");
            setIsVerified(true);
        } catch (error) {
            setError(error.message);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setError("");

        if (!firstName || !lastName || !age || !location) {
            setError("Please fill in all fields.");
            return;
        }

        try {
            const userDoc = doc(db, "users", auth.currentUser .uid);
            await setDoc(userDoc, {
                firstName,
                lastName,
                age,
                location,
                email,
            });
            alert("Registration successful!");
            router.push("/login");
        } catch (error) {
            setError(error.message);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
                <h1 className="text-2xl font-bold mb-6 text-center">Signup</h1>
                {!isVerified ? (
                    <form onSubmit={handleSignup} className="mb-4">
                        <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full p-2 mb-4 border border-gray-300 rounded"
                            required
                        />
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full p-2 mb-4 border border-gray-300 rounded"
                            required
                        />
                        <button
                            type="submit"
                            className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 transition duration-200"
                        >
                            Send Verification
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleRegister} className="mb-4">
                        <input
                            type="text"
                            placeholder="First Name"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            className="w-full p-2 mb-4 border border-gray-300 rounded"
                            required
                        />
                        <input
                            type="text"
                            placeholder="Last Name"
                            value={lastName}
                            onChange={(e) => setLastName(e .target.value)}
                            className="w-full p-2 mb-4 border border-gray-300 rounded"
                            required
                        />
                        <input
                            type="number"
                            placeholder="Age"
                            value={age}
                            onChange={(e) => setAge(e.target.value)}
                            className="w-full p-2 mb-4 border border-gray-300 rounded"
                            required
                        />
                        <input
                            type="text"
                            placeholder="Location"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            className="w-full p-2 mb-4 border border-gray-300 rounded"
                            required
                        />
                        <button
                            type="submit"
                            className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 transition duration-200"
                        >
                            Register
                        </button>
                    </form>
                )}
                {error && <p className="text-red-500 text-center">{error}</p>}
            </div>
        </div>
    );
};

export default Signup;