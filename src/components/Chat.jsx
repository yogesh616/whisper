import React, { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "react-router-dom";
import { collection, addDoc, Timestamp, onSnapshot, query, orderBy } from "firebase/firestore";
import { db, auth } from "../firebase_config";
import { onAuthStateChanged } from "firebase/auth";
import { useUser } from "../Context/Context";
import '../App.css'
import notification from '../assets/notification.mp3'

const Chat = () => {
  const { id: receiverId } = useParams();
  const [userId, setUserId] = useState(null);
   const [messages, setMessages] = useState(() => {
    const chats = localStorage.getItem('chats');
    return chats? JSON.parse(chats) : [];
  });
  const [newMessage, setNewMessage] = useState("");
  const { state } = useLocation();
  const [userData, setUserData] = useState(state?.data || {});
  const messagesEndRef = useRef(null);
  const [bgurl, setBgUrl ] = useState(() => {
    const url = localStorage.getItem('bgurl');
    return url || ''  });
    const [chatFont, setChatFont ] = useState(() => {
      const url = localStorage.getItem('font');
      return url || ''  });
  const audio = useRef(
    new Audio(
    notification )
  );
  const { bgImages, fonts } = useUser();
  const [image, setImage] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  

  const offcanvasRef = useRef(null);
  const chatRef = useRef(null);

  function toggleOffcanvas() {
    if (offcanvasRef.current) {
      offcanvasRef.current.classList.toggle("translate-x-0");
      offcanvasRef.current.classList.toggle("translate-x-full");
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      }
    });
    return () => unsubscribe();
  }, []);

  const getChatId = () => [userId, receiverId].sort().join("_");

  async function sendMessage() {
    if (newMessage.trim()) {
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
        scrollToBottom();
      } catch (err) {
        console.error("Error sending message:", err);
      }
    }
  }

   // Upload image
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
  
  // Send image as a message
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


  useEffect(() => {
    if (!userId || !receiverId) return;

    const chatId = getChatId();
    const messagesRef = collection(db, "chats", chatId, "messages");
    const q = query(messagesRef, orderBy("timestamp"));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const messagesArray = querySnapshot.docs.map((doc) => doc.data());
      setMessages(messagesArray);
       localStorage.setItem('chats', JSON.stringify(messagesArray));
      if (querySnapshot.size && querySnapshot.docs[querySnapshot.size - 1].data().sender !== userId) {
        audio.current.play();
      }

      scrollToBottom();
      scrollToBottom();
    });

    return () => unsubscribe();
  }, [userId, receiverId]);

  const scrollToBottom = () => {
  
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
   
  };
  
  
  

  function handleEnter(e) {
    if (e.key === "Enter" && newMessage) {
      sendMessage();
    }
  }
  function changeBGImage(url) {
    if (chatRef.current) {
      chatRef.current.style.backgroundImage = `url('${url}')`; 
     toggleOffcanvas();
      localStorage.setItem('bgurl', url);
      
    }
  }
  function changeFont(font) {
    if (chatRef.current) {
      chatRef.current.style.fontFamily = font; 
     toggleOffcanvas();
      localStorage.setItem('font', font);
      
    }
  }
  

  return (
    <div className="flex flex-col h-screen bg-zinc-700">
      <div className="flex bg-zinc-700 items-center justify-between gap-2 p-1 px-3 text-slate-200 shadow-md">
        <div className="flex items-center gap-2">
          <img
            className="w-10 h-10 rounded-full"
            src={userData?.photoURL || "https://www.pngall.com/wp-content/uploads/5/Profile-Avatar-PNG.png"}
            alt="profile"
          />
          <h1 className="text-lg font-semibold">{userData?.displayName || "User"}</h1>
        </div>
        <div>
          <button onClick={toggleOffcanvas} className="font-medium rounded-lg text-sm px-5 py-2.5 mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12H12m-8.25 5.25h16.5" />
            </svg>
          </button>
        </div>
      </div>

      <div
        ref={offcanvasRef}
        className="fixed inset-y-0 right-0 w-64 bg-zinc-700 text-white transform translate-x-full transition-transform duration-300"
      >
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
            <div
              key={index}
              style={{ backgroundImage: `url(${bgImage})` }}
              className="w-full h-24 bg-cover bg-center rounded-md cursor-pointer hover:opacity-80"
              onClick={() => changeBGImage(bgImage)}
            ></div>
          ))}
        </div>
        <h1 className="text-xl px-4">Fonts</h1>
        <div className="flex flex-col items-center gap-4  px-2 overflow-auto h-1/2 pb-3">
          {fonts.map((font, index) => (
            <div
              key={index}
              style={{ fontFamily: font }}
              className=" w-24 h-auto bg-cover bg-center rounded-md cursor-pointer hover:opacity-80"
              onClick={() => changeFont(font)}
            >{font}</div>
          ))}
        </div>

      </div>

      <div id='theme' ref={chatRef} style={{fontFamily: chatFont, backgroundImage: `url(${bgurl})`, backgroundRepeat: 'no-repeat', backgroundSize: 'cover', backgroundPosition: 'center', backgroundBlendMode: 'overlay', transition: 'all 0.5s ease'}} className=" flex-1 overflow-y-auto p-4 space-y-3">
       
        {messages ? messages.map((message, index) => (
          <div key={index} className={`flex ${message.sender === userId ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-xs p-3 rounded-lg ${
                message.sender === userId ? "bg-blue-500 text-white rounded-br-none" : "bg-gray-200 text-gray-900 rounded-bl-none"
              }`}
            >
              {message.text && <p>{message.text}</p>}
              {message.image && (
             
               <img src={message.image} alt="uploaded" className="p-0.5 rounded-md w-48" />
              )}
            </div>
          </div>
        )) : (<div className="loader">
          <svg viewBox="0 0 80 80">
            <circle r="32" cy="40" cx="40" id="test"></circle>
          </svg>
        </div>)}
        <div ref={messagesEndRef} />
      </div>

       <div className="p-2 bg-zinc-700 shadow-inner">
      
<div className="messageBox">
  <div className="fileUploadWrapper">
    <label htmlFor="file">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 337 337">
        <circle
          strokeWidth="20"
          stroke="#6c6c6c"
          fill="none"
          r="158.5"
          cy="168.5"
          cx="168.5"
        ></circle>
        <path
          strokeLinecap="round"
          strokeWidth="25"
          stroke="#6c6c6c"
          d="M167.759 79V259"
        ></path>
        <path
          strokeLinecap="round"
          strokeWidth="25"
          stroke="#6c6c6c"
          d="M79 167.138H259"
        ></path>
      </svg>
      <span className="tooltip">Add an image</span>
    </label>
    <input type="file" id="file" name="file" onChange={(e) => uploadImage(e.target.files[0])} />
  </div>
  <input required="" placeholder="Message..." type="text" id="messageInput" value={newMessage} onChange={e=> setNewMessage(e.target.value)} onKeyDown={handleEnter}  />
  <button id="sendButton">
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 664 663">
      <path
        fill="none"
        d="M646.293 331.888L17.7538 17.6187L155.245 331.888M646.293 331.888L17.753 646.157L155.245 331.888M646.293 331.888L318.735 330.228L155.245 331.888"
      ></path>
      <path
        strokeLinejoin="round"
        strokeLinecap="round"
        strokeWidth="33.67"
        stroke="#6c6c6c"
        d="M646.293 331.888L17.7538 17.6187L155.245 331.888M646.293 331.888L17.753 646.157L155.245 331.888M646.293 331.888L318.735 330.228L155.245 331.888"
      ></path>
    </svg>
  </button>
</div>

      </div>
    </div>
  );
};

export default Chat;
