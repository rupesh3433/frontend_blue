import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { toast } from "sonner"; // Notification for errors

const SOCKET_SERVER_URL = import.meta.env.VITE_APP_API_URL || "http://localhost:5000";

interface Message {
  sender: string;
  text: string;
  timestamp?: string;
}

// Helper to fix ISO timestamp string (limit fractional seconds to milliseconds)
const fixTimestamp = (timestamp?: string): string => {
  if (!timestamp) return "";
  return timestamp.replace(/\.(\d{3})\d*Z$/, ".$1Z");
};

// Format a timestamp for display
const formatMessageTime = (timestamp?: string): string => {
  if (!timestamp) return "Unknown time";
  
  const fixedTimestamp = fixTimestamp(timestamp);
  const dateObj = new Date(fixedTimestamp);
  
  if (isNaN(dateObj.getTime())) {
    return "Unknown time";
  }
  
  return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export const ChatRoom: React.FC<{ groupId: string }> = ({ groupId }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const currentEmail = localStorage.getItem("email") || "unknown@example.com";
  const currentName = localStorage.getItem("name") || "You"; // Current user's name

  // Fetch initial chat history via REST API
  useEffect(() => {
    const fetchChatHistory = async () => {
      setIsLoading(true);
      const token = localStorage.getItem("token");
      
      if (!token) {
        toast.error("Authentication required. Please log in again.");
        setIsLoading(false);
        return;
      }
      
      try {
        const response = await fetch(`${SOCKET_SERVER_URL}/api/chats?groupId=${groupId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        
        if (!response.ok) {
          throw new Error(`Server returned ${response.status}`);
        }
        
        const data = await response.json();
        
        if (Array.isArray(data)) {
          console.log(`Loaded ${data.length} messages from history`);
          setMessages(data);
        } else {
          console.error("Unexpected chat history format", data);
          setMessages([]);
        }
      } catch (err) {
        console.error("Failed to fetch chat history", err);
        toast.error("Failed to load chat history. Please try refreshing.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchChatHistory();
  }, [groupId]);

  // Set up WebSocket connection using auth property for token
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("No token found. Please log in again.");
      return;
    }
    
    // For testing: force polling transport to isolate WebSocket issues
    const transports = process.env.NODE_ENV === "development" ? ["polling"] : ["websocket", "polling"];

    const newSocket = io(SOCKET_SERVER_URL, {
      transports,
      timeout: 30000,
      reconnectionAttempts: 5,
      auth: { token },
    });

    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("Connected to chat server with ID:", newSocket.id);
      newSocket.emit("join", { groupId, email: currentEmail });
    });

    newSocket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
      toast.error("Failed to connect to chat server. Please refresh the page.");
    });

    newSocket.on("disconnect", (reason) => {
      console.warn("Socket disconnected:", reason);
    });

    newSocket.on("chat_history", (data) => {
      console.log(`Received ${data.messages?.length || 0} messages from socket`);
      if (data.messages && Array.isArray(data.messages)) {
        setMessages(data.messages);
      }
    });

    newSocket.on("new_message", (message: Message) => {
      console.log("New message received:", message);
      setMessages((prev) => [...prev, message]);
    });

    newSocket.on("status", (data) => {
      console.log("Status update:", data.msg);
    });

    newSocket.on("error", (data) => {
      console.error("Server error:", data.message);
      toast.error(data.message || "An error occurred");
    });

    return () => {
      newSocket.emit("leave", { groupId, email: currentEmail });
      newSocket.disconnect();
    };
  }, [groupId, currentEmail]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!newMessage.trim()) return;
    
    if (!socket || !socket.connected) {
      toast.error("Cannot send message: not connected to server.");
      return;
    }
    
    socket.emit("message", {
      groupId,
      sender: currentEmail,
      text: newMessage,
    });
    
    console.log("Message sent:", newMessage);
    setNewMessage("");
  };

  return (
    <div className="flex flex-col h-full p-4 bg-gray-900 text-white rounded-lg shadow-md">
      <div className="flex-grow overflow-auto space-y-4 mb-4">
        {isLoading ? (
          <div className="flex justify-center items-center h-32">
            <p className="text-gray-400">Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center p-8">
            <p className="text-gray-400">No messages yet. Start chatting!</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isCurrentUser = msg.sender === currentEmail;
            const timeString = formatMessageTime(msg.timestamp);
            
            return (
              <div
                key={index}
                className={`flex flex-col max-w-[70%] p-3 rounded-lg shadow-sm ${
                  isCurrentUser
                    ? "bg-blue-700 ml-auto"
                    : "bg-gray-700 mr-auto"
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <p className="text-sm font-semibold">
                    {isCurrentUser ? currentName : msg.sender.split('@')[0]}
                  </p>
                  <p className="text-xs opacity-70 ml-4">{timeString}</p>
                </div>
                <p>{msg.text}</p>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-gray-600 pt-3">
        <div className="flex items-center gap-3">
          <Input
            type="text"
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-grow bg-gray-800 text-white border-gray-600"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <Button onClick={handleSend} disabled={!newMessage.trim()}>
            Send
          </Button>
        </div>
      </div>
    </div>
  );
};
