import { useUser } from "../Context/Context";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase_config";
import { useState, useEffect, useRef } from "react";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";

const ChatList = () => {
  const { userListData } = useUser();
  const [lastMessages, setLastMessages] = useState({});
  const [typingUsers, setTypingUsers] = useState({});
  const userId = auth.currentUser?.uid;
  const navigate = useNavigate();

  // cache debounce refs
  const cacheWriteTimer = useRef(null);

  // localStorage key generator (namespaced by current user)
  const cacheKey = userId ? `chatlist_cache_${userId}` : null;

  // Load cached data immediately on userId change
  useEffect(() => {
    if (!cacheKey) return;
    try {
      const raw = localStorage.getItem(cacheKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed?.lastMessages) setLastMessages(parsed.lastMessages);
      if (parsed?.typingUsers) setTypingUsers(parsed.typingUsers);
    } catch (e) {
      // ignore parse errors
      console.warn("ChatList: failed to read cache", e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Persist cache (debounced)
  const persistCache = (lm, tu) => {
    if (!cacheKey) return;
    if (cacheWriteTimer.current) clearTimeout(cacheWriteTimer.current);
    cacheWriteTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(cacheKey, JSON.stringify({ lastMessages: lm, typingUsers: tu, savedAt: Date.now() }));
      } catch (e) {
        console.warn("ChatList: failed to write cache", e);
      }
    }, 800); // 800ms debounce
  };

  // Fetch latest messages & typing status with realtime listeners
  useEffect(() => {
    if (!userId || !userListData?.length) return;

    const unsubscribes = [];

    userListData.forEach((user) => {
      const chatId = [userId, user.id].sort().join("_");

      // last message listener
      const messagesRef = collection(db, "chats", chatId, "messages");
      const q = query(messagesRef, orderBy("timestamp", "desc"), limit(1));
      const unsubMsg = onSnapshot(
        q,
        (snapshot) => {
          if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            const data = { id: doc.id, ...doc.data() };

            // Avoid setting state if the message didn't change
            setLastMessages((prev) => {
              // same id => no change
              if (prev[user.id]?.id === data.id) return prev;
              const next = { ...prev, [user.id]: data };
              // persist updated cache (debounced)
              persistCache(next, typingUsers);
              return next;
            });
          }
        },
        (err) => {
          console.error("ChatList: last message listener error", err);
        }
      );

      unsubscribes.push(unsubMsg);

      // typing collection listener (we only care about doc where id === user.id)
      const typingRef = collection(db, "chats", chatId, "typing");
      const unsubTyping = onSnapshot(
        typingRef,
        (snap) => {
          // find doc with id === user.id (other user's typing doc)
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
        (err) => {
          console.error("ChatList: typing listener error", err);
        }
      );

      unsubscribes.push(unsubTyping);
    });

    // cleanup all listeners
    return () => {
      unsubscribes.forEach((u) => {
        try {
          u();
        } catch (e) {}
      });
      // flush cache write if pending
      if (cacheWriteTimer.current) {
        clearTimeout(cacheWriteTimer.current);
        cacheWriteTimer.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, JSON.stringify(userListData)]); // JSON.stringify to shallowly watch array contents

  const handleChatClick = (data) => {
    navigate(`/chat/${data.id}`, { state: { data } });
  };

  // Sort users by last message timestamp (cached or live)
  const sortedUsers = [...userListData].sort((a, b) => {
    const aTs = lastMessages[a.id]?.timestamp?.toMillis?.() || 0;
    const bTs = lastMessages[b.id]?.timestamp?.toMillis?.() || 0;
    return bTs - aTs;
  });

  // With a safe helper:
const getTime = (ts) => {
  if (!ts) return "";
  // Firestore Timestamp object
  if (typeof ts.toDate === "function") return ts.toDate();
  // Cached timestamp (number or ISO string)
  if (ts.seconds) return new Date(ts.seconds * 1000); // Firestore object from cache
  if (typeof ts === "number") return new Date(ts);
  return new Date(ts);
};

  return (
    <div className="p-4 space-y-3">
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
  );
};

export default ChatList;
