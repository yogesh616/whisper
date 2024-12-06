import { useUser } from "../Context/Context";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase_config";
import { useState, useEffect } from "react";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";

const ChatList = () => {
  const { userListData } = useUser(); 
  const [lastMessages, setLastMessages] = useState({});
  const userId = auth.currentUser?.uid;
  const navigate = useNavigate();

  useEffect(() => {
    if (!userId || !userListData.length) return;

    const unsubscribes = userListData.map((user) => {
      const chatId = [userId, user.id].sort().join("_");
      const messagesRef = collection(db, "chats", chatId, "messages");
      const q = query(messagesRef, orderBy("timestamp", "desc"), limit(1));

      return onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const lastMessage = snapshot.docs[0].data();
          setLastMessages((prev) => ({
            ...prev,
            [user.id]: lastMessage,
          }));
        }
      });
    });

    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  }, [userId, userListData]);

  const handleChatClick = (data) => {
    navigate(`/chat/${data.id}`, { state: { data }});
  };
  

  return (
    <div className="p-4 space-y-4">
      {userListData.map((user) => {
        const lastMessage = lastMessages[user.id] || {};
        return (
          <div
            key={user.id}
            className="flex justify-between items-center cursor-pointer w-full"
            onClick={() => handleChatClick(user)}
          >
            <div className="flex items-center space-x-3">
              <img
                className="w-10 h-10 rounded-full"
                src={user.photoURL}
                alt="profile"
                onError={(e) =>
                  (e.target.src =
                    "https://www.pngall.com/wp-content/uploads/5/Profile-Avatar-PNG.png")
                }
              />
              <div>
                <h3 className="font-semibold">{user.displayName}</h3>
                <p className="text-sm text-gray-600">{lastMessage.text || "No messages yet"}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">
                {lastMessage.timestamp
                  ? new Date(lastMessage.timestamp.toDate()).toLocaleTimeString()
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
