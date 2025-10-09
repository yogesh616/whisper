import { useUser } from "../Context/Context";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase_config";
import { useState, useEffect } from "react";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";

const ChatList = () => {
  const { userListData } = useUser();
  const [lastMessages, setLastMessages] = useState({});
  const [typingUsers, setTypingUsers] = useState({});
  const userId = auth.currentUser?.uid;
  const navigate = useNavigate();

  // Fetch latest messages for each user
  useEffect(() => {
    if (!userId || !userListData.length) return;

    const unsubscribes = userListData.map((user) => {
      const chatId = [userId, user.id].sort().join("_");
      const messagesRef = collection(db, "chats", chatId, "messages");
      const q = query(messagesRef, orderBy("timestamp", "desc"), limit(1));

      // Listen for last message
      const unsubMsg = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const lastMessage = snapshot.docs[0].data();
          setLastMessages((prev) => ({
            ...prev,
            [user.id]: lastMessage,
          }));
        }
      });

      // Listen for typing status
      const typingRef = collection(db, "chats", chatId, "typing");
      const unsubTyping = onSnapshot(typingRef, (snap) => {
        snap.forEach((doc) => {
          if (doc.id === user.id) {
            setTypingUsers((prev) => ({
              ...prev,
              [user.id]: doc.data().typing,
            }));
          }
        });
      });

      return () => {
        unsubMsg();
        unsubTyping();
      };
    });

    return () => unsubscribes.forEach((u) => u && u());
  }, [userId, userListData]);

  const handleChatClick = (data) => {
    navigate(`/chat/${data.id}`, { state: { data } });
  };

  // Sort users by last message timestamp
  const sortedUsers = [...userListData].sort((a, b) => {
    const aTime = lastMessages[a.id]?.timestamp?.toMillis?.() || 0;
    const bTime = lastMessages[b.id]?.timestamp?.toMillis?.() || 0;
    return bTime - aTime;
  });

  return (
    <div className="p-4 space-y-3">
      {sortedUsers.map((user) => {
        const lastMessage = lastMessages[user.id] || {};
        const isTyping = typingUsers[user.id];
        const isOnline = user.status; // from Firestore USERS collection

        return (
          <div
            key={user.id}
            onClick={() => handleChatClick(user)}
            className="flex justify-between items-center cursor-pointer w-full p-2 hover:bg-gray-100 rounded-lg transition"
          >
            {/* Left: Profile + Info */}
            <div className="flex items-center space-x-3">
              <div className="relative">
                <img
                  className="w-10 h-10 rounded-full object-cover"
                  src={
                    user.photoURL ||
                    "https://www.pngall.com/wp-content/uploads/5/Profile-Avatar-PNG.png"
                  }
                  alt="profile"
                />
                {isOnline && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                )}
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">{user.displayName || "Unknown User"}</h3>
                <p className="text-sm text-gray-600 truncate w-40">
                  {isTyping
                    ? "Typing..."
                    : lastMessage.text
                    ? lastMessage.text
                    : lastMessage.image
                    ? "📷 Sent a photo"
                    : "No messages yet"}
                </p>
              </div>
            </div>

            {/* Right: Time + Unread */}
            <div className="text-right">
              <p className="text-xs text-gray-500">
                {lastMessage.timestamp
                  ? new Date(lastMessage.timestamp.toDate()).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : ""}
              </p>
              {lastMessage.unread > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1">
                  {lastMessage.unread}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ChatList;
