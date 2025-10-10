import { useUser } from "../Context/Context";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase_config";
import { useState, useEffect, useRef } from "react";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";

const ChatList = () => {
  const { userListData, isOffcanvasOpen, setIsOffcanvasOpen } = useUser();
  const [lastMessages, setLastMessages] = useState({});
  const [typingUsers, setTypingUsers] = useState({});
  
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const userId = auth.currentUser?.uid;
  const navigate = useNavigate();

  const cacheWriteTimer = useRef(null);
  const cacheKey = userId ? `chatlist_cache_${userId}` : null;

  // Load cached data
  useEffect(() => {
    if (!cacheKey) return;
    try {
      const raw = localStorage.getItem(cacheKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed?.lastMessages) setLastMessages(parsed.lastMessages);
      if (parsed?.typingUsers) setTypingUsers(parsed.typingUsers);
    } catch (e) {
      console.warn("ChatList: failed to read cache", e);
    }
  }, [userId]);

  const persistCache = (lm, tu) => {
    if (!cacheKey) return;
    if (cacheWriteTimer.current) clearTimeout(cacheWriteTimer.current);
    cacheWriteTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(
          cacheKey,
          JSON.stringify({ lastMessages: lm, typingUsers: tu, savedAt: Date.now() })
        );
      } catch (e) {
        console.warn("ChatList: failed to write cache", e);
      }
    }, 800);
  };

  // Fetch latest messages & typing
  useEffect(() => {
    if (!userId || !userListData?.length) return;
    const unsubscribes = [];

    userListData.forEach((user) => {
      const chatId = [userId, user.id].sort().join("_");

      // last message
      const messagesRef = collection(db, "chats", chatId, "messages");
      const q = query(messagesRef, orderBy("timestamp", "desc"), limit(1));
      const unsubMsg = onSnapshot(
        q,
        (snapshot) => {
          if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            const data = { id: doc.id, ...doc.data() };
            setLastMessages((prev) => {
              if (prev[user.id]?.id === data.id) return prev;
              const next = { ...prev, [user.id]: data };
              persistCache(next, typingUsers);
              return next;
            });
          }
        },
        (err) => console.error("ChatList: last message listener error", err)
      );
      unsubscribes.push(unsubMsg);

      // typing listener
      const typingRef = collection(db, "chats", chatId, "typing");
      const unsubTyping = onSnapshot(
        typingRef,
        (snap) => {
          snap.forEach((d) => {
            if (d.id === user.id) {
              const value = Boolean(d.data()?.typing);
              setTypingUsers((prev) => {
                if (prev[user.id] === value) return prev;
                const next = { ...prev, [user.id]: value };
                persistCache(lastMessages, next);
                return next;
              });
            }
          });
        },
        (err) => console.error("ChatList: typing listener error", err)
      );
      unsubscribes.push(unsubTyping);
    });

    return () => {
      unsubscribes.forEach((u) => u());
      if (cacheWriteTimer.current) clearTimeout(cacheWriteTimer.current);
    };
  }, [userId, JSON.stringify(userListData)]);

  const handleChatClick = (data) => {
    navigate(`/chat/${data.id}`, { state: { data } });
  };

  const getTime = (ts) => {
    if (!ts) return "";
    if (typeof ts.toDate === "function") return ts.toDate();
    if (ts.seconds) return new Date(ts.seconds * 1000);
    if (typeof ts === "number") return new Date(ts);
    return new Date(ts);
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate("/login");
    } catch (e) {
      console.error("Logout failed", e);
    }
  };

  const sortedUsers = [...userListData].sort((a, b) => {
    const aTs = lastMessages[a.id]?.timestamp?.toMillis?.() || 0;
    const bTs = lastMessages[b.id]?.timestamp?.toMillis?.() || 0;
    return bTs - aTs;
  });

  return (
    <div className="relative h-screen bg-gray-50">
      {/* Header */}
      
        <h1 className="text-xl font-semibold">Chats</h1>
       
      

      {/* Offcanvas */}
     {/* Overlay */}
<div
  className={`fixed inset-0 bg-black/40 z-30 transition-opacity duration-300 ${
    isOffcanvasOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
  }`}
  onClick={() => setIsOffcanvasOpen(false)}
/>

{/* Offcanvas panel */}
<div
  className={`fixed top-0 right-0 w-64 h-full bg-white shadow-2xl z-40 flex flex-col justify-between transform transition-transform duration-300 ${
    isOffcanvasOpen ? "translate-x-0" : "translate-x-full"
  }`}
>
  <div>
    <div className="p-4 border-b">
      <h2 className="text-lg font-semibold">Menu</h2>
    </div>
    <div className="p-4 space-y-3 overflow-y-auto">
      <p className="text-gray-600 text-sm hidden">Settings / Themes / Profile...</p>
    </div>
  </div>
  <div className="p-4 border-t">
    <button
      onClick={() => setShowLogoutConfirm(true)}
      className="w-full bg-red-500 text-white py-2 rounded-lg hover:bg-red-600 transition"
    >
      Logout
    </button>
  </div>
</div>



      {/* Logout confirmation modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="absolute inset-0 bg-black/50" />
          <div className="bg-white p-6 rounded-lg shadow-lg z-50 w-80 text-center">
            <h3 className="text-lg font-semibold mb-4">Confirm Logout</h3>
            <p className="mb-6">Are you sure you want to log out?</p>
            <div className="flex justify-between gap-4">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2 bg-gray-200 rounded hover:bg-gray-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat list */}
      <div className="p-4 space-y-3 overflow-y-auto h-[calc(100%-64px)]">
        {sortedUsers.map((user) => {
          const lastMessage = lastMessages[user.id] || {};
          const isTyping = typingUsers[user.id];
          const isOnline = user.status;

          return (
            <div
              key={user.id}
              onClick={() => handleChatClick(user)}
              className="flex justify-between items-center cursor-pointer w-full p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <img
                    className="w-10 h-10 rounded-full object-cover"
                    src={user.photoURL || "https://www.pngall.com/wp-content/uploads/5/Profile-Avatar-PNG.png"}
                    alt="profile"
                  />
                  {isOnline && <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-500">{user.displayName || "Unknown User"}</h3>
                  <p className="text-base font-bold text-zinc-800 truncate w-40">
                    {isTyping ? "Typing..." : lastMessage.text ? lastMessage.text : lastMessage.image ? "📷 Sent a photo" : "No messages yet"}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <p className="text-xs text-gray-500">
                  {lastMessage.timestamp ? getTime(lastMessage.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                </p>
                {lastMessage.unread > 0 && <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1">{lastMessage.unread}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ChatList;
