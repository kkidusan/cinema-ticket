"use client";
import { useState } from "react";
import { db, auth } from "../firebaseconfig";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { collection, addDoc } from "firebase/firestore";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import { Loader2 } from "lucide-react"; // Importing a loading spinner icon
import { useRouter } from "next/navigation";

export default function RegisterForm() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    password: "",
    location: "",
    phoneNumber: "",
    tradeCertificate: "", // Store certificate as Base64
    countryCode: "+251",
  });
  const router = useRouter();

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = () => {
    let newErrors = {};
    if (!formData.firstName.trim()) newErrors.firstName = "First name is required.";
    if (!formData.lastName.trim()) newErrors.lastName = "Last name is required.";
    if (!formData.username.trim()) newErrors.username = "Username is required.";
    if (!formData.email.match(/^[\w-]+@([\w-]+\.)+[\w-]{2,4}$/)) newErrors.email = "Invalid email format.";
    if (formData.password.length < 6) newErrors.password = "Password must be at least 6 characters.";
    if (!formData.location.trim()) newErrors.location = "Location is required.";
    if (!formData.tradeCertificate) newErrors.tradeCertificate = "Trade certificate file is required.";

    // Validate Ethiopian phone number
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
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, tradeCertificate: reader.result });
        setErrors({ ...errors, tradeCertificate: "" });
      };
      reader.readAsDataURL(file); // Store Base64 version
    } else {
      setErrors({ ...errors, tradeCertificate: "Please select a valid file." });
    }
  };

  const handlePhoneChange = (value, country) => {
    const rawNumber = value.replace(/^\+?[0-9]{1,3}/, ""); // Remove country code prefix
    setFormData({
      ...formData,
      phoneNumber: rawNumber,
      countryCode: `+${country.dialCode}`,
    });
    setErrors({ ...errors, phoneNumber: "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const userId = userCredential.user.uid;

      await addDoc(collection(db, "owner"), {
        uid: userId,
        ...formData,
        phoneNumber: formData.countryCode + formData.phoneNumber, // Ensure proper format
        role: "owner",
        approvedDate: new Date(),
        approved: false,
      });

      router.push("/login");
      setFormData({
        firstName: "",
        lastName: "",
        username: "",
        email: "",
        location: "",
        phoneNumber: "",
        tradeCertificate: "",
        countryCode: "+251",
      });
      setErrors({});
    } catch (error) {
      alert(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100 dark:bg-gray-900 p-6">
      <div className="w-full max-w-2xl bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg transition-all">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white text-center mb-6">Register</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
          {["firstName", "lastName", "username", "email", "password", "location"].map((key) => (
            <div key={key}>
              <input
                type={key === "password" ? "password" : key === "email" ? "email" : "text"}
                name={key}
                placeholder={key.replace(/([A-Z])/g, " $1").trim()}
                value={formData[key]}
                onChange={handleChange}
                className={`w-full p-3 border rounded-lg ${errors[key] ? "border-red-500" : "border-blue-500"} focus:ring-2 focus:ring-blue-300`}
              />
              {errors[key] && <p className="text-red-500 text-sm mt-1">{errors[key]}</p>}
            </div>
          ))}

          <div className="col-span-2">
            <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-1">Phone Number</label>
            <PhoneInput
              country={"et"}
              value={formData.countryCode + formData.phoneNumber}
              onChange={handlePhoneChange}
              enableSearch={true}
              className="w-full"
            />
            {errors.phoneNumber && <p className="text-red-500 text-sm mt-1">{errors.phoneNumber}</p>}
          </div>

          <div className="col-span-2">
            <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-1">Trade Certificate</label>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileChange}
              className="w-full p-2 border border-blue-500 rounded-lg bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-blue-300"
            />
            {errors.tradeCertificate && <p className="text-red-500 text-sm mt-1">{errors.tradeCertificate}</p>}
          </div>

          <button
            type="submit"
            className="col-span-2 w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition-all duration-300 shadow-md disabled:opacity-50 flex items-center justify-center"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin mr-2" size={20} /> {/* Loading spinner */}
                Registering...
              </>
            ) : (
              "Register"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}