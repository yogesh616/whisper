import React, { useState, useEffect, useRef } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import {
  collection,
  addDoc,
  Timestamp,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";
import { db, auth } from "../firebase_config";
import { onAuthStateChanged } from "firebase/auth";
import { useUser } from "../Context/Context";
import "../App.css";
import notification from "../assets/notification.mp3";

const Chat = () => {
  const { id: receiverId } = useParams();
  const [userId, setUserId] = useState(null);
  const [messages, setMessages] = useState(() => {
    const chats = localStorage.getItem("chats");
    return chats ? JSON.parse(chats) : [];
  });
  const [newMessage, setNewMessage] = useState("");
  const { state } = useLocation();
  const [userData, setUserData] = useState(state?.data || {});
  const [bgurl, setBgUrl] = useState(() => localStorage.getItem("bgurl") || "");
  const [chatFont, setChatFont] = useState(() => localStorage.getItem("font") || "");
  const [image, setImage] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const audio = useRef(new Audio(notification));
  const messagesEndRef = useRef(null);
  const offcanvasRef = useRef(null);
  const chatRef = useRef(null);
  const navigate = useNavigate();
  const { bgImages, fonts } = useUser();

  // Handle user authentication
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        navigate("/");
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  };

  // Generate chat ID
  const getChatId = () => [userId, receiverId].sort().join("_");

  // Fetch messages in real-time
  useEffect(() => {
    if (!userId || !receiverId) return;

    const chatId = getChatId();
    const messagesRef = collection(db, "chats", chatId, "messages");
    const q = query(messagesRef, orderBy("timestamp"));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const messagesArray = querySnapshot.docs.map((doc) => doc.data());
      setMessages(messagesArray);
      localStorage.setItem("chats", JSON.stringify(messagesArray));

      // Play notification sound if a new message is received
      if (
        querySnapshot.size &&
        querySnapshot.docs[querySnapshot.size - 1].data().sender !== userId
      ) {
        audio.current.play();
      }
      scrollToBottom();
    });

    return () => unsubscribe();
  }, [userId, receiverId]);

  // Send a text message
  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      const chatId = getChatId();
      const messagesRef = collection(db, "chats", chatId, "messages");

      await addDoc(messagesRef, {
        text: newMessage,
        sender: userId,
        receiver: receiverId,
        timestamp: Timestamp.fromDate(new Date()),
        name: userData?.displayName,
        photo: userData?.photoURL,
      });

      setNewMessage("");
      scrollToBottom();
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  // Upload and send an image
  const uploadImage = async (image) => {
    if (!image) return;

    setIsUploading(true);

    const data = new FormData();
    data.append("file", image);
    data.append("upload_preset", "profilepic");

    try {
      const res = await fetch("https://api.cloudinary.com/v1_1/dgmuxyoc0/upload", {
        method: "POST",
        body: data,
      });

      if (!res.ok) {
        throw new Error(`Failed to upload image: ${res.statusText}`);
      }

      const result = await res.json();
      await sendImage(result.secure_url); // Send the image message after successful upload
    } catch (err) {
      console.error("Image upload failed:", err);
    } finally {
      setIsUploading(false);
      setImage(null); // Reset the image state
    }
  };

  // Send an image as a message
  const sendImage = async (imageUrl) => {
    try {
      const chatId = getChatId();
      const messagesRef = collection(db, "chats", chatId, "messages");

      await addDoc(messagesRef, {
        image: imageUrl,
        sender: userId,
        receiver: receiverId,
        timestamp: Timestamp.fromDate(new Date()),
        name: userData?.displayName,
        photo: userData?.photoURL,
      });

      scrollToBottom();
    } catch (err) {
      console.error("Error sending image:", err);
    }
  };

  // Handle "Enter" key press
  const handleEnter = (e) => {
    if (e.key === "Enter") sendMessage();
  };

  // Toggle themes offcanvas
  const toggleOffcanvas = () => {
    if (offcanvasRef.current) {
      offcanvasRef.current.classList.toggle("translate-x-0");
      offcanvasRef.current.classList.toggle("translate-x-full");
    }
  };

  // Change chat background
  const changeBGImage = (url) => {
    setBgUrl(url);
    localStorage.setItem("bgurl", url);
    chatRef.current.style.backgroundImage = `url('${url}')`;
    toggleOffcanvas();
  };

  // Change chat font
  const changeFont = (font) => {
    setChatFont(font);
    localStorage.setItem("font", font);
    chatRef.current.style.fontFamily = font;
    toggleOffcanvas();
  };

  return (
    <div className="flex flex-col h-screen bg-zinc-700">
      {/* Header */}
      <div className="flex bg-zinc-700 items-center justify-between gap-2 p-1 px-3 text-slate-200 shadow-md">
        <div className="flex items-center gap-2">
          <img
            className="w-10 h-10 rounded-full"
            src={userData?.photoURL || "https://www.pngall.com/wp-content/uploads/5/Profile-Avatar-PNG.png"}
            alt="profile"
          />
          <h1 className="text-lg font-semibold">{userData?.displayName || "User"}</h1>
        </div>
        <button onClick={toggleOffcanvas} className="text-white">
          ☰
        </button>
      </div>

      {/* Offcanvas Themes */}
      <div
        ref={offcanvasRef}
        className="fixed inset-y-0 right-0 w-64 bg-zinc-700 text-white transform translate-x-full transition-transform duration-300"
      >
        <div className="p-4">
          <h1 className="text-xl">Themes</h1>
          <button onClick={toggleOffcanvas}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4 p-4 overflow-auto h-1/2">
          {bgImages.map((bgImage, index) => (
            <div
              key={index}
              style={{ backgroundImage: `url(${bgImage})` }}
              className="w-full h-24 bg-cover bg-center rounded-md cursor-pointer hover:opacity-80"
              onClick={() => changeBGImage(bgImage)}
            ></div>
          ))}
        </div>
        <h1 className="text-xl px-4">Fonts</h1>
        <div className="flex flex-col items-center gap-4 px-2 overflow-auto h-1/2 pb-3">
          {fonts.map((font, index) => (
            <div
              key={index}
              style={{ fontFamily: font }}
              className="w-24 h-auto rounded-md cursor-pointer hover:opacity-80"
              onClick={() => changeFont(font)}
            >
              {font}
            </div>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div
        ref={chatRef}
        style={{
          fontFamily: chatFont,
          backgroundImage: `url(${bgurl})`,
          backgroundSize: "cover",
          backgroundRepeat: "no-repeat",
        }}
        className="flex-1 overflow-y-auto p-4 space-y-3"
      >
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex items-start gap-2 p-2 rounded-md shadow ${
              message.sender === userId ? "bg-blue-500 text-white self-end" : "bg-gray-300"
            }`}
          >
            <img
              src={message.photo || "https://www.pngall.com/wp-content/uploads/5/Profile-Avatar-PNG.png"}
              alt="profile"
              className="w-10 h-10 rounded-full"
            />
            <div>
              {message.text && <p>{message.text}</p>}
              {message.image && <img src={message.image} alt="uploaded" className="p-0.5 rounded-md w-48" />}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef}></div>
      </div>

      {/* Input Section */}
      <div className="flex items-center p-2 bg-gray-700 gap-2">
        <input
          type="file"
          accept="image/*"
          id="imageInput"
          onChange={(e) => uploadImage(e.target.files[0])}
          hidden
        />
        <label htmlFor="imageInput" className="cursor-pointer">
          {isUploading ? (
            <div className="w-8 h-8 rounded-full animate-spin border-4 border-white border-t-transparent"></div>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6 text-white"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 12l6-6m0 0l6 6m-6-6v12"
              />
            </svg>
          )}
        </label>
        <input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={handleEnter}
          placeholder="Type a message..."
          className="flex-1 p-2 rounded-lg bg-gray-200"
        />
        <button onClick={sendMessage} className="text-white p-2 bg-blue-500 rounded-md hover:bg-blue-600">
          Send
        </button>
      </div>
    </div>
  );
};

export default Chat;
