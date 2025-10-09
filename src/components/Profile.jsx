import React, { useState, useEffect } from "react";
import { collection, doc, getDocs, updateDoc } from "firebase/firestore";
import { db, auth } from "../firebase_config";
import Header from "./Header";
import ChatList from "./ChatList";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";

function Profile() {
  const [users, setUsers] = useState([]);
  const [userId, setUserId] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const navigate = useNavigate();

  // ✅ Track auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);

        const userRef = doc(db, "USERS", user.uid);

        // Mark as online
        try {
          await updateDoc(userRef, { status: true });
        } catch (err) {
          console.error("Error setting status true:", err);
        }

        // Mark as offline when tab closes or refreshes
        const handleUnload = async () => {
          try {
            await updateDoc(userRef, { status: false });
          } catch (err) {
            console.error("Error setting status false on unload:", err);
          }
        };

        window.addEventListener("beforeunload", handleUnload);

        // Cleanup on unmount
        return () => {
          window.removeEventListener("beforeunload", handleUnload);
        };
      } else {
        navigate("/");
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  // ✅ Logout function
  async function logout() {
    if (!userId) return;
    try {
      const userRef = doc(db, "USERS", userId);
      await updateDoc(userRef, { status: false });
      await signOut(auth);
      setShowModal(false);
      navigate("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  }

  // ✅ Fetch all users (for chat list)
  const fetchAllUsers = async () => {
    try {
      const usersCollectionRef = collection(db, "USERS");
      const querySnapshot = await getDocs(usersCollectionRef);
      const usersList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setUsers(usersList);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  useEffect(() => {
    fetchAllUsers();
  }, []);

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <Header />

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        <ChatList users={users} />
      </div>

      {/* Logout Button */}
      <div className="p-4 flex justify-center">
        <button
          onClick={() => setShowModal(true)}
          className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg font-semibold shadow-md transition-all duration-200"
        >
          Log Out
        </button>
      </div>

      {/* Logout Confirmation Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 w-80 sm:w-96 relative">
            {/* Close Button */}
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Modal Content */}
            <div className="text-center">
              <svg
                className="mx-auto mb-3 text-gray-400 w-12 h-12 dark:text-gray-200"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h3 className="mb-4 text-lg font-medium text-gray-700 dark:text-gray-200">
                Are you sure you want to log out?
              </h3>
              <div className="flex justify-center gap-3">
                <button
                  onClick={logout}
                  className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-lg transition-all duration-200"
                >
                  Yes, log out
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="border border-gray-300 text-gray-700 dark:text-gray-300 px-5 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Profile;
