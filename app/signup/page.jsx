
"use client"
import { useState } from "react";
import { db, auth } from "../firebaseconfig";

import { createUserWithEmailAndPassword } from "firebase/auth";
import { collection, addDoc } from "firebase/firestore";
import { toast } from "react-toastify";

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
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData({ ...formData, tradeCertificate: reader.result });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // Create user in Firebase Auth
            const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
            const userId = userCredential.user.uid;

            // Save user data to Firestore
            await addDoc(collection(db, "owner"), {
                uid: userId,
                firstName: formData.firstName,
                lastName: formData.lastName,
                username: formData.username,
                email: formData.email,
                location: formData.location,
                phoneNumber: formData.phoneNumber,
                tradeCertificate: formData.tradeCertificate,
            });

            alert("Registration successful!");
            setFormData({ firstName: "", lastName: "", username: "", email: "", password: "", location: "", phoneNumber: "", tradeCertificate: "" });
        } catch (error) {
            toast.error(error.message);
        }
    };

    return (
        <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-bold mb-4">Register</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <input type="text" name="firstName" placeholder="First Name" value={formData.firstName} onChange={handleChange} className="input-field" required />
                <input type="text" name="lastName" placeholder="Last Name" value={formData.lastName} onChange={handleChange} className="input-field" required />
                <input type="text" name="username" placeholder="Username" value={formData.username} onChange={handleChange} className="input-field" required />
                <input type="email" name="email" placeholder="Email" value={formData.email} onChange={handleChange} className="input-field" required />
                <input type="password" name="password" placeholder="Password" value={formData.password} onChange={handleChange} className="input-field" required />
                <input type="text" name="location" placeholder="Location" value={formData.location} onChange={handleChange} className="input-field" required />
                <input type="tel" name="phoneNumber" placeholder="Phone Number" value={formData.phoneNumber} onChange={handleChange} className="input-field" required />
                <input type="file" onChange={handleFileChange} className="input-field" required />
                <button type="submit" className="btn-primary">Register</button>
            </form>
        </div>
    );
}
