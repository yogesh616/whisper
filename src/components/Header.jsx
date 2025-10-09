import React, { useState, useEffect } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db, auth } from "../firebase_config";
import { useUser } from "../Context/Context";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";

const Header = () => {
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const { setUserListData } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    let unsubscribeAuth;
    let unsubscribeUsers;

    unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);

        // Real-time listener to all USERS
        const usersRef = collection(db, "USERS");
        unsubscribeUsers = onSnapshot(
          usersRef,
          (snapshot) => {
            const allUsers = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));

            // Exclude the current logged-in user
            const filteredUsers = allUsers.filter(
              (u) => u.id !== user.uid
            );
            setUsers(filteredUsers);
            setUserListData(filteredUsers);
          },
          (error) => console.error("Error fetching users:", error)
        );
      } else {
        setCurrentUser(null);
        setUsers([]);
      }
    });

    // Cleanup listeners on unmount
    return () => {
      if (unsubscribeAuth) unsubscribeAuth();
      if (unsubscribeUsers) unsubscribeUsers();
    };
  }, [setUserListData]);

  const handleChatClick = (userData) => {
    navigate(`/chat/${userData.id}`, { state: { data: userData } });
  };

  return (
    <div className="p-4 bg-white shadow-md sticky top-0 z-30">
      {/* Header Bar */}
      <div className="flex justify-between items-center mb-3">
        <h1 className="text-lg sm:text-xl font-semibold text-gray-800">
          {currentUser?.displayName || "Loading..."}
        </h1>
        <button className="p-2 rounded-full hover:bg-gray-100 transition">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.8}
            stroke="currentColor"
            className="w-6 h-6 text-gray-700"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 6.75h16.5M3.75 12H12m-8.25 5.25h16.5"
            />
          </svg>
        </button>
      </div>

      {/* Stories Row */}
      <div className="flex items-center gap-4 overflow-x-auto hide-scrollbar pb-2">
        {/* Optional: Add Story Placeholder */}
        <div className="flex flex-col items-center shrink-0 cursor-pointer">
          <div className="h-14 w-14 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition">
            <span className="text-2xl font-bold">+</span>
          </div>
          <p className="text-xs mt-1 text-gray-500">Add Story</p>
        </div>

        {/* Users List */}
        {users.map((userItem, index) => (
          <div
            key={index}
            onClick={() => handleChatClick(userItem)}
            className="flex flex-col items-center shrink-0 cursor-pointer"
          >
            <div className="relative w-14 h-14">
              <img
                src={
                  userItem.photoURL ||
                  "https://www.pngall.com/wp-content/uploads/5/Profile-Avatar-PNG.png"
                }
                alt={userItem.displayName || "User"}
                className="w-14 h-14 rounded-full object-cover border-2 border-gray-200"
                onError={(e) => {
                  e.target.src =
                    "https://www.pngall.com/wp-content/uploads/5/Profile-Avatar-PNG.png";
                }}
              />
              <span
                className={`absolute bottom-1 right-1 w-3.5 h-3.5 rounded-full border-2 border-white ${
                  userItem.status ? "bg-green-500" : "bg-gray-400"
                }`}
              ></span>
            </div>
            <p className="text-xs mt-1 text-center text-gray-700 truncate w-14">
              {userItem.displayName?.split(" ")[0] || "User"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Header;
