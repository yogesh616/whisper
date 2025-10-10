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
    </div>
  );
}

export default Profile;
