"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../../firebaseconfig";
import { collection, query, where, getDocs, updateDoc, doc } from "firebase/firestore";
import { Bell } from "lucide-react"; // Notification icon
import Image from "next/image";

export default function AboutPage() {
  const [userEmail, setUserEmail] = useState(null);
  const [pendingOwners, setPendingOwners] = useState([]);
  const [openCertificate, setOpenCertificate] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      // router.push("/login");
    } else {
      setUserEmail(user.email);
    }
  }, [router]);

  // Fetch pending owners from Firestore
  const fetchPendingOwners = async () => {
    try {
      const ownersRef = collection(db, "owner");
      const q = query(ownersRef, where("approved", "==", false));
      const querySnapshot = await getDocs(q);
      const ownersData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setPendingOwners(ownersData);
    } catch (error) {
      console.error("Error fetching pending owners:", error);
    }
  };

  useEffect(() => {
    fetchPendingOwners(); // Fetch data initially

    // Refresh the data every 3 minutes
    const interval = setInterval(() => {
      fetchPendingOwners();
    }, 1); // 180000ms = 3 minutes

    return () => clearInterval(interval); // Cleanup interval on unmount
  }, []);

  // Approve Owner Function
  const handleApproveOwner = async (ownerId, ownerEmail) => {
    try {
      const ownerDocRef = doc(db, "owner", ownerId);
      await updateDoc(ownerDocRef, {
        approved: true,
      });

      // Update UI after approval
      setPendingOwners((prevOwners) =>
        prevOwners.filter((owner) => owner.email !== ownerEmail)
      );
    } catch (error) {
      console.error("Error approving owner:", error);
    }
  };

  // Function to render Base64 Trade Certificate
  const renderTradeCertificate = (certificateData) => {
    if (certificateData.includes("data:image")) {
      return (
        <Image
          src={certificateData}
          alt="Trade Certificate"
          width={400}
          height={400}
          className="rounded-md shadow-md"
        />
      );
    } else if (certificateData.includes("data:application/pdf")) {
      const pdfData = certificateData.replace("data:application/pdf;base64,", "");
      const pdfUrl = `data:application/pdf;base64,${pdfData}`;
      
      return (
        <iframe
          src={pdfUrl}
          width="100%"
          height="600px"
          className="border-2 rounded-md"
        />
      );
    } else {
      return <p className="text-gray-500">Invalid or unsupported Trade Certificate format.</p>;
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      {/* Header with Notification Icon */}
      <header className="flex justify-between items-center p-5 bg-white shadow-md">
        <h1 className="text-2xl font-bold">About Page</h1>
        <div className="relative">
          <Bell className="w-6 h-6 text-gray-700 cursor-pointer" />
          {pendingOwners.length > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full px-2">
              {pendingOwners.length}
            </span>
          )}
        </div>
      </header>

      {/* Pending Approvals Section */}
      <div className="container mx-auto p-6">
        <h2 className="text-xl font-semibold mb-4">Pending Approvals</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pendingOwners.length > 0 ? (
            pendingOwners.map((owner) => (
              <div key={owner.id} className="bg-white p-4 shadow-lg rounded-xl">
                <h3 className="text-lg font-bold">
                  {owner.firstName} {owner.lastName}
                </h3>
                <p className="text-gray-600">{owner.email}</p>
                <p className="text-gray-600">{owner.location}</p>
                <p className="text-gray-600">{owner.phoneNumber}</p>

                {/* Button to open the certificate */}
                {owner.tradeCertificate && (
                  <div className="mt-4">
                    <button
                      onClick={() => setOpenCertificate(owner.id)}
                      className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                    >
                      Read Certificate
                    </button>
                  </div>
                )}

                {/* Conditional rendering of the certificate */}
                {openCertificate === owner.id && (
                  <div className="mt-4">
                    {renderTradeCertificate(owner.tradeCertificate)}
                  </div>
                )}

                {/* Approve Button */}
                <button
                  onClick={() => handleApproveOwner(owner.id, owner.email)}
                  className="mt-4 bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-700"
                >
                  Approve
                </button>
              </div>
            ))
          ) : (
            <p className="text-gray-500">No pending approvals.</p>
          )}
        </div>
      </div>
    </div>
  );
}
