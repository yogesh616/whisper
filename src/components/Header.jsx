import React, { useState, useEffect } from "react";
import { SearchIcon } from "@heroicons/react/outline";
import { collection, onSnapshot } from "firebase/firestore";
import { db, auth } from "../firebase_config";
import { useUser } from "../Context/Context";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";

const Header = () => {
  const [users, setUsers] = useState([]); // State to hold all users
  const { setUserListData } = useUser();
  const [user, setUser] = useState(null); // State to hold the logged-in user
  const navigate = useNavigate();
  
  useEffect(() => {
    // Listen for authentication state changes to get the logged-in user
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user); // Set the logged-in user
      }
    });
    return () => unsubscribe(); // Cleanup listener on component unmount
  }, []);

  const fetchAllUsers = () => {
    const usersCollectionRef = collection(db, "USERS"); // Reference to USERS collection

    // Set up a real-time listener using onSnapshot
    const unsubscribe = onSnapshot(usersCollectionRef, (snapshot) => {
      const usersList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Filter out the logged-in user from the list
      const filteredUsers = usersList.filter((userItem) => userItem.id !== user?.uid);
      
      setUsers(filteredUsers); // Update state with the filtered users
      setUserListData(filteredUsers); // Optionally update other context or global state
    }, (error) => {
      console.error("Error fetching users:", error);
    });

    // Cleanup listener on component unmount
    return unsubscribe;
  };

  // Fetch users when the component mounts and when user state changes
  useEffect(() => {
    if (user) {
      const unsubscribe = fetchAllUsers(); // Fetch all users after the user is authenticated
      return () => unsubscribe(); // Cleanup the listener
    }
  }, [user]); // Dependency on `user` state

  const handleChatClick = (data) => {
    navigate(`/chat/${data.id}`, { state: { data }});
    
  };

  return (
    <div className="p-4 bg-white shadow-md">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">{user ? user.displayName : "Loading..."}</h1>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12H12m-8.25 5.25h16.5" />
</svg>

      </div>

      {/* Stories */}
      <div className="flex space-x-4 mt-4 overflow-x-auto">
        <div className=" flex-col items-center hidden">
          <div className="h-16 w-16 rounded-full border border-gray-300 flex items-center justify-center">
            <span className="text-2xl font-bold">+</span>
          </div>
          <p className="text-sm mt-2">Add story</p>
        </div>
        <div className="flex gap-2 overflow-x-auto">
  {users.map((userItem, index) => (
    <div key={index} className="flex flex-col items-center shrink-0" >
      <div className="relative me-4"  onClick={() => handleChatClick(userItem)}>
        <img
          className="w-10 h-10 rounded-full object-cover"
          src={userItem.photoURL}
          alt={`${userItem.displayName}'s profile`}
          onError={(e) =>
            (e.target.src =
              "https://www.pngall.com/wp-content/uploads/5/Profile-Avatar-PNG.png")
          }
        />
        <span
          className={`top-0 start-7 absolute w-3.5 h-3.5 border-2 rounded-full ${
            userItem.status ? "bg-green-500" : "bg-slate-300"
          }`}
        ></span>
      </div>
      <p className="text-sm mt-2 text-center">{userItem.displayName}</p>
    </div>
  ))}
</div>

      </div>
    </div>
  );
};

export default Header;
