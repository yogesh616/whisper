// Chat.jsx (refactored)
import React, { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "react-router-dom";
import {
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
  setDoc,
  doc,
} from "firebase/firestore";
import { db, auth } from "../firebase_config";
import { onAuthStateChanged } from "firebase/auth";
import { useUser } from "../Context/Context";
import notification from "../assets/notification.mp3";
import { LazyLoadImage } from "react-lazy-load-image-component";
import "react-lazy-load-image-component/src/effects/blur.css";

const Chat = () => {
  const { id: receiverId } = useParams();
  const { state } = useLocation();
  const receiverData = state?.data || {};

  const [userId, setUserId] = useState(null);
  const [currentUserData, setCurrentUserData] = useState({});
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState(""); // unified input state
  const [isUploading, setIsUploading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  const messagesEndRef = useRef(null);
  const offcanvasRef = useRef(null);
  const chatRef = useRef(null);

  const audioRef = useRef(new Audio(notification));
  const lastMessageIdRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const typingStateRef = useRef(false); // to avoid repeated writes

  const { bgImages = [], fonts = [] } = useUser();

  // ---- helper: chatId ----
  const getChatId = () => (userId && receiverId ? [userId, receiverId].sort().join("_") : null);

  // ---- auth observer to get current user id and profile ----
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
        setCurrentUserData({
          uid: user.uid,
          displayName: user.displayName || "Me",
          photoURL: user.photoURL || "",
        });
      } else {
        setUserId(null);
        setCurrentUserData({});
      }
    });
    return () => unsub();
  }, []);

  // ---- scroll helper ----
  const scrollToBottom = () => {
    // small timeout to let DOM update
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, 50);
  };

  // ---- message listener ----
  useEffect(() => {
    const chatId = getChatId();
    if (!chatId) return;

    const messagesRef = collection(db, "chats", chatId, "messages");
    const q = query(messagesRef, orderBy("timestamp", "asc"));

    const unsubscribe = onSnapshot(q, (qs) => {
      const msgs = qs.docs.map((d) => ({ id: d.id, ...d.data() }));
      setMessages(msgs);

      // store per-chat cache (optional)
      try {
        localStorage.setItem(`chat_${chatId}`, JSON.stringify(msgs));
      } catch (e) {
        // ignore storage failures
      }

      // play sound only when latest message is from other user and it's a new message
      if (msgs.length) {
        const latest = msgs[msgs.length - 1];
        const prevId = lastMessageIdRef.current;
        if (latest.id !== prevId && latest.sender !== userId) {
          // only play when page is visible
          if (document.visibilityState === "visible") {
            audioRef.current?.play().catch(() => {
              /* autoplay blocked or error - ignore */
            });
          }
        }
        lastMessageIdRef.current = latest.id;
      }

      scrollToBottom();
    });

    return () => unsubscribe();
  }, [userId, receiverId]);

  // ---- send a text message ----
  const sendMessage = async () => {
    const text = (message || "").trim();
    if (!text) return;

    const chatId = getChatId();
    if (!chatId) return;

    const messagesRef = collection(db, "chats", chatId, "messages");

    try {
      // clear local input immediately for UX
      setMessage("");
      // optionally mark typing false
      await setTyping(false);

      await addDoc(messagesRef, {
        text,
        sender: userId,
        receiver: receiverId,
        timestamp: serverTimestamp(),
        name: currentUserData.displayName,
        photo: currentUserData.photoURL,
      });
      // scroll will be handled by snapshot listener
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  // ---- image upload + send (cloudinary) ----
  const uploadImage = async (file) => {
    if (!file) return;
    setIsUploading(true);

    const data = new FormData();
    data.append("file", file);
    data.append("upload_preset", "profilepic");

    try {
      const res = await fetch("https://api.cloudinary.com/v1_1/dgmuxyoc0/upload", {
        method: "POST",
        body: data,
      });
      if (!res.ok) throw new Error("Upload failed");
      const json = await res.json();
      const imageUrl = json.secure_url;
      await sendImage(imageUrl);
    } catch (err) {
      console.error("Image upload failed:", err);
    } finally {
      setIsUploading(false);
    }
  };

  const sendImage = async (imageUrl) => {
    const chatId = getChatId();
    if (!chatId) return;
    const messagesRef = collection(db, "chats", chatId, "messages");
    try {
      await addDoc(messagesRef, {
        image: imageUrl,
        sender: userId,
        receiver: receiverId,
        timestamp: serverTimestamp(),
        name: currentUserData.displayName,
        photo: currentUserData.photoURL,
      });
    } catch (err) {
      console.error("Error sending image:", err);
    }
  };

  // ---- typing indicator helpers ----
  const setTyping = async (value) => {
    const chatId = getChatId();
    if (!chatId || !userId) return;

    // reduce writes: only write when state changes
    if (typingStateRef.current === value) return;
    typingStateRef.current = value;

    try {
      const typingDocRef = doc(db, "chats", chatId, "typing", userId);
      await setDoc(typingDocRef, { typing: value }, { merge: true });
    } catch (err) {
      console.error("Error updating typing status:", err);
    }
  };

  // debounced handler for input changes to avoid too many writes
  const handleTypingChange = (text) => {
    setMessage(text);

    // clear previous timer
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    // set typing true immediately (but setDoc guarded inside setTyping)
    setTyping(true);

    // set typing false after 1.5s of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      setTyping(false);
    }, 1500);
  };

  // ---- listen to the other user's typing doc ----
  useEffect(() => {
    const chatId = getChatId();
    if (!chatId || !receiverId) return;

    const typingDocRef = doc(db, "chats", chatId, "typing", receiverId);
    const unsubscribe = onSnapshot(typingDocRef, (snap) => {
      setIsTyping(Boolean(snap.exists() && snap.data().typing));
    });

    return () => unsubscribe();
  }, [userId, receiverId]);

  // ---- cleanup typing state on unmount / page unload ----
  useEffect(() => {
    const handleUnload = async () => {
      // try to set typing false (best-effort)
      try {
        await setTyping(false);
      } catch (e) {}
    };
    window.addEventListener("beforeunload", handleUnload);

    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      // clear timer
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      // ensure typing false
      setTyping(false).catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, receiverId]);

  // ---- small helpers for UI changes ----
  function toggleOffcanvas() {
    if (!offcanvasRef.current) return;
    offcanvasRef.current.classList.toggle("translate-x-0");
    offcanvasRef.current.classList.toggle("translate-x-full");
  }

  function changeBGImage(url) {
    if (chatRef.current) {
      chatRef.current.style.backgroundImage = `url('${url}')`;
      localStorage.setItem("bgurl", url);
    }
    toggleOffcanvas();
  }

  function changeFont(font) {
    if (chatRef.current) {
      chatRef.current.style.fontFamily = font;
      localStorage.setItem("font", font);
    }
    toggleOffcanvas();
  }

  // ---- send on Enter ----
  const handleEnter = (e) => {
    if (e.key === "Enter" && message.trim()) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ---- initial load: try to restore cached messages for this chat (optional) ----
  useEffect(() => {
    const chatId = getChatId();
    if (!chatId) return;
    try {
      const cached = localStorage.getItem(`chat_${chatId}`);
      if (cached) {
        setMessages(JSON.parse(cached));
        setTimeout(scrollToBottom, 50);
      }
    } catch (e) {}
  }, [userId, receiverId]);

  return (
    <div className="flex flex-col h-screen bg-zinc-700">
      {/* header */}
      <div className="flex bg-zinc-700 items-center justify-between gap-2 p-1 px-3 text-slate-200 shadow-md">
        <div className="flex items-center gap-2">
          <img
            className="w-10 h-10 rounded-full"
            src={receiverData?.photoURL || "https://www.pngall.com/wp-content/uploads/5/Profile-Avatar-PNG.png"}
            alt="profile"
          />
          <h1 className="text-lg font-semibold">{receiverData?.displayName || "User"}</h1>
        </div>
        <div>
          <button onClick={toggleOffcanvas} className="font-medium rounded-lg text-sm px-5 py-2.5 mb-2">
            {/* menu icon */}
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12H12m-8.25 5.25h16.5" />
            </svg>
          </button>
        </div>
      </div>

      {/* offcanvas */}
      <div ref={offcanvasRef} className="fixed inset-y-0 right-0 w-64 bg-zinc-700 text-white transform translate-x-full transition-transform duration-300">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-xl">Themes</h1>
          <button onClick={toggleOffcanvas}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 p-4 overflow-auto h-1/2">
          {bgImages.map((bgImage, index) => (
            <div key={index} className="w-full h-24 rounded-md cursor-pointer hover:opacity-80" onClick={() => changeBGImage(bgImage)}>
              <LazyLoadImage src={bgImage} alt={`Background ${index}`} effect="blur" className="w-full h-full bg-cover bg-center rounded-md" />
            </div>
          ))}
        </div>

        <h1 className="text-xl px-4">Fonts</h1>
        <div className="flex flex-col items-center gap-4 px-2 overflow-auto h-1/2 pb-3">
          {fonts.map((font, index) => (
            <div key={index} style={{ fontFamily: font }} className="w-24 h-auto bg-cover bg-center rounded-md cursor-pointer hover:opacity-80" onClick={() => changeFont(font)}>
              {font}
            </div>
          ))}
        </div>
      </div>

      {/* chat area */}
      <div id="theme" ref={chatRef} style={{ height: "90vh", backgroundRepeat: "no-repeat", backgroundSize: "cover", backgroundPosition: "center", backgroundBlendMode: "overlay", transition: "all 0.5s ease" }} className="mb-3 flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length ? (
          messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender === userId ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-xs p-3 rounded-lg ${msg.sender === userId ? "bg-blue-500 text-white rounded-br-none" : "bg-gray-200 text-gray-900 rounded-bl-none"}`}>
                {msg.text && <p>{msg.text}</p>}
                {msg.image && <img src={msg.image} alt="uploaded" className="p-0.5 rounded-md w-48" />}
                <div className="text-xs text-gray-500 mt-1 text-right">
                  {msg.timestamp && msg.timestamp.toDate ? new Date(msg.timestamp.toDate()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="loader">
            <svg viewBox="0 0 80 80">
              <circle r="32" cy="40" cx="40" id="test"></circle>
            </svg>
          </div>
        )}

        {isTyping && (
          <div className="p-2">
            {/* typing indicator */}
            <div className="typing-indicator">
              <div className="typing-circle"></div>
              <div className="typing-circle"></div>
              <div className="typing-circle"></div>
              <div className="typing-shadow"></div>
              <div className="typing-shadow"></div>
              <div className="typing-shadow"></div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* composer */}
      <div className="p-2 bg-zinc-700 shadow-inner">
        <div className="messageBox">
          <div className="fileUploadWrapper">
            <label htmlFor="file">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 337 337">
                <circle strokeWidth="20" stroke="#6c6c6c" fill="none" r="158.5" cy="168.5" cx="168.5"></circle>
                <path strokeLinecap="round" strokeWidth="25" stroke="#6c6c6c" d="M167.759 79V259"></path>
                <path strokeLinecap="round" strokeWidth="25" stroke="#6c6c6c" d="M79 167.138H259"></path>
              </svg>
              <span className="tooltip">Add an image</span>
            </label>
            <input
              type="file"
              id="file"
              name="file"
              onChange={(e) => {
                if (e.target.files?.[0]) uploadImage(e.target.files[0]);
              }}
            />
          </div>

          <input
            placeholder="Message..."
            type="text"
            id="messageInput"
            value={message}
            onChange={(e) => handleTypingChange(e.target.value)}
            onKeyDown={handleEnter}
            onBlur={() => setTyping(false)}
          />

          <button id="sendButton" onClick={sendMessage}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 664 663" className="w-6 h-6">
              <path strokeLinejoin="round" strokeLinecap="round" strokeWidth="33.67" stroke="#6c6c6c" d="M646.293 331.888L17.7538 17.6187L155.245 331.888M646.293 331.888L17.753 646.157L155.245 331.888M646.293 331.888L318.735 330.228L155.245 331.888"></path>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chat;
