// Chat.jsx (with fixed reply UI and delete confirmation)
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
  deleteDoc,
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
  const [message, setMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [bgUrl, setBgUrl] = useState("");
  const [chatFont, setChatFont] = useState("");
  const [replyTo, setReplyTo] = useState(null);

  const messagesEndRef = useRef(null);
  const offcanvasRef = useRef(null);
  const chatRef = useRef(null);
  const audioRef = useRef(new Audio(notification));
  const lastMessageIdRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const typingStateRef = useRef(false);

  const { bgImages = [], fonts = [] } = useUser();

  const chatKey = () => {
    const chatId = userId && receiverId ? [userId, receiverId].sort().join("_") : null;
    return chatId ? `chat_${chatId}_messages` : null;
  };

  const getChatId = () => (userId && receiverId ? [userId, receiverId].sort().join("_") : null);

  // ---- auth observer ----
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

  // ---- apply persisted theme/font when opening chat ----
  useEffect(() => {
    const savedBg = localStorage.getItem("bgurl") || "";
    const savedFont = localStorage.getItem("font") || "";
    setBgUrl(savedBg);
    setChatFont(savedFont);

    if (chatRef.current) {
      if (savedBg) chatRef.current.style.backgroundImage = `url('${savedBg}')`;
      if (savedFont) chatRef.current.style.fontFamily = savedFont;
    }
  }, []);

  // helper to apply visually & persist
  function changeBGImage(url) {
    if (chatRef.current) {
      chatRef.current.style.backgroundImage = `url('${url}')`;
    }
    setBgUrl(url);
    localStorage.setItem("bgurl", url);
    toggleOffcanvas();
  }

  function changeFont(font) {
    if (chatRef.current) {
      chatRef.current.style.fontFamily = font;
    }
    setChatFont(font);
    localStorage.setItem("font", font);
    toggleOffcanvas();
  }

  // ---- scroll helper ----
  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, 50);
  };

  // ---- Restore cached messages for this chat on first load ----
  useEffect(() => {
    const key = chatKey();
    if (!key) return;
    try {
      const cached = localStorage.getItem(key);
      if (cached) {
        setMessages(JSON.parse(cached));
        setTimeout(scrollToBottom, 50);
      }
    } catch (e) {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, receiverId]);

  // ---- Firestore message listener ----
  useEffect(() => {
    const chatId = getChatId();
    if (!chatId) return;

    const messagesRef = collection(db, "chats", chatId, "messages");
    const q = query(messagesRef, orderBy("timestamp", "asc"));

    const unsubscribe = onSnapshot(q, (qs) => {
      const msgs = qs.docs.map((d) => ({ id: d.id, ...d.data() }));
      setMessages(msgs);

      // persist last N messages (say 50) to localStorage
      try {
        const lastN = msgs.slice(-50);
        localStorage.setItem(`chat_${chatId}_messages`, JSON.stringify(lastN));
      } catch (e) {}

      // play notification only for new remote messages
      if (msgs.length) {
        const latest = msgs[msgs.length - 1];
        const prevId = lastMessageIdRef.current;
        if (latest.id !== prevId && latest.sender !== userId) {
          if (document.visibilityState === "visible") {
            audioRef.current?.play().catch(() => {});
          }
        }
        lastMessageIdRef.current = latest.id;
      }

      scrollToBottom();
    });

    return () => unsubscribe();
  }, [userId, receiverId]);

  // ---- typing indicator write ----
  const setTyping = async (value) => {
    const chatId = getChatId();
    if (!chatId || !userId) return;

    if (typingStateRef.current === value) return;
    typingStateRef.current = value;

    try {
      const typingDocRef = doc(db, "chats", chatId, "typing", userId);
      await setDoc(typingDocRef, { typing: value }, { merge: true });
    } catch (err) {
      console.error("Error updating typing status:", err);
    }
  };

  // debounced typing handler
  const handleTypingChange = (text) => {
    setMessage(text);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    if (text.trim()) {
      setTyping(true);
      typingTimeoutRef.current = setTimeout(() => {
        setTyping(false);
      }, 1500);
    } else {
      setTyping(false);
    }
  };

  // listen to other user's typing doc
  useEffect(() => {
    const chatId = getChatId();
    if (!chatId || !receiverId) return;
    const typingDocRef = doc(db, "chats", chatId, "typing", receiverId);
    const unsub = onSnapshot(typingDocRef, (snap) => {
      setIsTyping(Boolean(snap.exists() && snap.data().typing));
    });
    return () => unsub();
  }, [userId, receiverId]);

  // cleanup typing on unload
  useEffect(() => {
    const handleUnload = async () => {
      try {
        await setTyping(false);
      } catch (e) {}
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      setTyping(false).catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, receiverId]);

  // ---- send text message (with reply support) ----
  const sendMessage = async () => {
    const text = (message || "").trim();
    if (!text) return;
    const chatId = getChatId();
    if (!chatId) return;

    const messagesRef = collection(db, "chats", chatId, "messages");
    try {
      // optimistic clear
      setMessage("");
      await setTyping(false);

      const msgPayload = {
        text,
        sender: userId,
        receiver: receiverId,
        timestamp: serverTimestamp(),
        name: currentUserData.displayName,
        photo: currentUserData.photoURL,
      };

      if (replyTo) {
        // include reference
        msgPayload.replyTo = {
          id: replyTo.id,
          text: replyTo.text || "",
          image: replyTo.image || "",
          sender: replyTo.sender,
        };
      }

      await addDoc(messagesRef, msgPayload);

      // clear reply after send
      setReplyTo(null);
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  // ---- send image message ----
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

      // send image message with optional replyTo
      const chatId = getChatId();
      if (!chatId) return;
      const messagesRef = collection(db, "chats", chatId, "messages");

      const msgPayload = {
        image: imageUrl,
        sender: userId,
        receiver: receiverId,
        timestamp: serverTimestamp(),
        name: currentUserData.displayName,
        photo: currentUserData.photoURL,
      };

      if (replyTo) {
        msgPayload.replyTo = {
          id: replyTo.id,
          text: replyTo.text || "",
          image: replyTo.image || "",
          sender: replyTo.sender,
        };
      }

      await addDoc(messagesRef, msgPayload);
      setReplyTo(null);
    } catch (err) {
      console.error("Image upload failed:", err);
    } finally {
      setIsUploading(false);
    }
  };

  // ---- delete message (only by sender) - NO ALERT ----
  const deleteMessage = async (msgId, msgSender) => {
    if (!msgId) return;
    if (msgSender !== userId) return;

    const chatId = getChatId();
    if (!chatId) return;
    
    try {
      await deleteDoc(doc(db, "chats", chatId, "messages", msgId));

      // update local cache quickly (optional)
      const key = chatKey();
      if (key) {
        try {
          const cached = JSON.parse(localStorage.getItem(key) || "[]");
          const filtered = cached.filter((m) => m.id !== msgId);
          localStorage.setItem(key, JSON.stringify(filtered));
        } catch (e) {}
      }
    } catch (err) {
      console.error("Error deleting message:", err);
    }
  };

  // ---- prepare reply action ----
  const startReply = (msg) => {
    setReplyTo({ 
      id: msg.id, 
      text: msg.text || "", 
      image: msg.image || "", 
      sender: msg.sender 
    });
    // focus input
    document.getElementById("messageInput")?.focus();
  };

  // ---- send on Enter ----
  const handleEnter = (e) => {
    if (e.key === "Enter" && message.trim()) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ---- UI small helpers ----
  function toggleOffcanvas() {
    if (!offcanvasRef.current) return;
    offcanvasRef.current.classList.toggle("translate-x-0");
    offcanvasRef.current.classList.toggle("translate-x-full");
  }

  // ---- render ----
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
          <div>
            <h1 className="text-lg font-semibold">{receiverData?.displayName || "User"}</h1>
            {isTyping && <p className="text-xs text-green-400">typing...</p>}
          </div>
        </div>
        <div>
          <button onClick={toggleOffcanvas} className="font-medium rounded-lg text-sm px-5 py-2.5 mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12H12m-8.25 5.25h16.5" />
            </svg>
          </button>
        </div>
      </div>

      {/* offcanvas */}
      <div ref={offcanvasRef} className="fixed inset-y-0 right-0 w-64 bg-zinc-700 text-white transform translate-x-full transition-transform duration-300 z-40">
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
            <div key={index} style={{ fontFamily: font }} className="w-24 h-auto bg-cover bg-center rounded-md cursor-pointer hover:opacity-80 p-2 text-center" onClick={() => changeFont(font)}>
              {font}
            </div>
          ))}
        </div>
      </div>

      {/* chat area */}
      <div
        id="theme"
        ref={chatRef}
        style={{
          height: "90vh",
          backgroundRepeat: "no-repeat",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundBlendMode: "overlay",
          transition: "all 0.5s ease",
          backgroundImage: bgUrl ? `url('${bgUrl}')` : undefined,
          fontFamily: chatFont || undefined,
        }}
        className="mb-3 flex-1 overflow-y-auto p-4 space-y-3"
      >
        {messages.length ? (
          messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender === userId ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-xs p-3 rounded-lg ${msg.sender === userId ? "bg-blue-500 text-white rounded-br-none" : "bg-gray-200 text-gray-900 rounded-bl-none"}`}>
                {/* reply snippet */}
                {msg.replyTo && (
                  <div className={`mb-2 p-2 rounded text-xs border-l-2 ${msg.sender === userId ? "bg-blue-600/50 border-blue-300" : "bg-gray-300 border-gray-500"}`}>
                    <div className={`font-semibold text-xs mb-1 ${msg.sender === userId ? "text-blue-100" : "text-gray-700"}`}>
                      Replying to
                    </div>
                    <div className={`text-xs truncate ${msg.sender === userId ? "text-white/90" : "text-gray-800"}`}>
                      {msg.replyTo.text || (msg.replyTo.image ? "📷 Photo" : "Message")}
                    </div>
                  </div>
                )}

                {msg.text && <p className="break-words">{msg.text}</p>}
                {msg.image && <img src={msg.image} alt="uploaded" className="mt-2 rounded-md w-48" />}

                <div className="text-xs mt-2 flex items-center justify-between gap-2">
                  <span className={msg.sender === userId ? "text-blue-100" : "text-gray-500"}>
                    {msg.timestamp && msg.timestamp.toDate ? new Date(msg.timestamp.toDate()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                  </span>

                  <div className="flex gap-2">
                    {/* Reply button */}
                    <button 
                      title="Reply" 
                      className={`text-xs hover:underline ${msg.sender === userId ? "text-blue-100 hover:text-white" : "text-gray-600 hover:text-gray-900"}`}
                      onClick={() => startReply(msg)}
                    >
                      ↩️ Reply
                    </button>
                    
                    {/* Delete button - only for sender */}
                    {msg.sender === userId && (
                      <button 
                        title="Delete" 
                        className="text-xs text-red-300 hover:text-red-100 hover:underline"
                        onClick={() => deleteMessage(msg.id, msg.sender)}
                      >
                        🗑️ Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center text-gray-300">
              <h2 className="text-2xl font-semibold">Start your legendary conversation</h2>
              <p className="mt-2 text-sm text-gray-400">Say hello 👋</p>
            </div>
          </div>
        )}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-gray-200 p-3 rounded-lg rounded-bl-none">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* composer */}
      <div className="p-2 bg-zinc-700 shadow-inner">
        {/* Reply preview bar - OUTSIDE messageBox */}
        {replyTo && (
          <div className="mb-2 p-2 bg-zinc-600 rounded-lg flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="text-xs text-blue-300 font-medium">Replying to:</div>
              <div className="text-sm text-white truncate">
                {replyTo.text || (replyTo.image ? "📷 Photo" : "Message")}
              </div>
            </div>
            <button 
              className="ml-3 text-white/70 hover:text-white text-lg leading-none px-2"
              onClick={() => setReplyTo(null)}
              title="Cancel reply"
            >
              ✕
            </button>
          </div>
        )}

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
              accept="image/*"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  uploadImage(e.target.files[0]);
                  e.target.value = ""; // Reset input
                }
              }}
            />
          </div>

          <input
            placeholder={isUploading ? "Uploading image..." : "Message..."}
            type="text"
            id="messageInput"
            value={message}
            onChange={(e) => handleTypingChange(e.target.value)}
            onKeyDown={handleEnter}
            onBlur={() => setTyping(false)}
            disabled={isUploading}
            className="w-full px-3 py-2 rounded"
          />

          <button 
            id="sendButton" 
            onClick={sendMessage}
            disabled={!message.trim() || isUploading}
            className="ml-2 disabled:opacity-50"
          >
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