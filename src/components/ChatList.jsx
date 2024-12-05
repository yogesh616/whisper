import { useUser } from "../Context/Context";
import { useNavigate } from "react-router-dom";
const ChatList = () => {
  const { userListData } = useUser();
  const navigate = useNavigate();
  
  const handleChatClick = (data) => {
    navigate(`/chat/${data.id}`, { state: { data }});
  };
  
    return (
      <div className="p-4 space-y-4">
        {userListData.map((chat, index) => (
          <div key={index} className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
            <img
                className="w-10 h-10 rounded-full"
                src={chat.photoURL}
                alt="profile image"
                onError={(e) =>
                  (e.target.src =
                    "https://www.pngall.com/wp-content/uploads/5/Profile-Avatar-PNG.png")
                }
              />
              <div className="cursor-pointer" onClick={() => handleChatClick( chat)}>
                <h3  className="font-semibold">{chat.displayName}</h3>
                <p className="text-sm text-gray-500">{chat.message}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">{chat.time}</p>
              {chat.unread > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1">
                  {chat.unread}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  export default ChatList;
  