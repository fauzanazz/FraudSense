# Chat & Call Application

A real-time chat and video calling application built with React, Node.js, Socket.IO, and WebRTC.

## Features

- **Real-time Chat**: Instant messaging between users using Socket.IO
- **Video Calls**: Peer-to-peer video calling using WebRTC
- **User Management**: Simple user creation and selection
- **Conversation History**: Persistent chat history stored in MongoDB
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

### Backend
- **Node.js** with Express.js
- **Socket.IO** for real-time communication
- **MongoDB** with Mongoose for data storage
- **WebRTC** signaling server

### Frontend
- **React** with Vite
- **Socket.IO Client** for real-time features
- **Axios** for HTTP requests
- **WebRTC** for video calling

## Prerequisites

- Node.js (v16 or higher)
- Docker and Docker Compose
- Modern web browser with WebRTC support

## Installation & Setup

### 1. Clone the repository
```bash
git clone <repository-url>
cd FraudSense
```

### 2. Setup Backend
```bash
cd backend
npm install
```

Create a `.env` file in the backend directory:
```env
PORT=3001
MONGODB_URI=mongodb://localhost:27017/chatapp
```

### 3. Setup Frontend
```bash
cd ../
npm install
```

### 4. Start MongoDB with Docker
Start MongoDB using Docker Compose:
```bash
docker-compose up -d mongodb
```

This will:
- Start MongoDB on port 27017
- Create a database user `chatapp_user` with password `chatapp_password`
- Initialize the `chatapp` database with required collections
- Optionally start Mongo Express (web UI) on port 8081

To view the database in your browser, visit: http://localhost:8081

### 5. Run the Application

Start the backend server:
```bash
cd backend
npm run dev
```

In a new terminal, start the frontend:
```bash
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

## Usage

### Getting Started
1. Open the application in your browser
2. Either select an existing user or create a new one
3. Click "Login" to enter the chat interface

### Chatting
1. Select a user from the "Start New Chat" section to create a conversation
2. Type your message in the input field and press Enter or click Send
3. Messages will appear in real-time for both users

### Video Calling
1. In an active conversation, click the "📞 Call" button
2. The other user will receive a call notification
3. Both users' video feeds will appear in the call interface
4. Click "End Call" to terminate the call

## Project Structure

```
FraudSense/
├── backend/
│   ├── models/
│   │   ├── User.js
│   │   ├── Conversation.js
│   │   └── Message.js
│   ├── routes/
│   │   ├── users.js
│   │   ├── conversations.js
│   │   └── messages.js
│   ├── server.js
│   ├── package.json
│   └── .env
├── src/
│   ├── components/
│   │   ├── Login.jsx
│   │   ├── ChatLayout.jsx
│   │   ├── ConversationList.jsx
│   │   ├── ChatWindow.jsx
│   │   ├── MessageList.jsx
│   │   ├── MessageInput.jsx
│   │   └── VideoCall.jsx
│   ├── App.jsx
│   ├── App.css
│   ├── index.css
│   └── main.jsx
├── package.json
└── README.md
```

## API Endpoints

### Users
- `GET /api/users` - Get all users
- `POST /api/users` - Create or get user
- `GET /api/users/:id` - Get user by ID

### Conversations
- `GET /api/conversations/:userId` - Get user's conversations
- `POST /api/conversations` - Create new conversation

### Messages
- `GET /api/messages/:conversationId` - Get conversation messages
- `POST /api/messages` - Send new message

## Socket.IO Events

### Chat Events
- `joinRoom` - Join a conversation room
- `sendMessage` - Send a message
- `receiveMessage` - Receive a message

### WebRTC Signaling Events
- `call-offer` - Initiate a call
- `call-answer` - Answer a call
- `ice-candidate` - Exchange ICE candidates
- `hang-up` - End a call

## Development

### Backend Development
```bash
cd backend
npm run dev  # Uses nodemon for auto-reload
```

### Frontend Development
```bash
npm run dev  # Vite dev server with hot reload
```

## Docker Commands

### MongoDB Management
```bash
# Start MongoDB only
docker-compose up -d mongodb

# Start MongoDB + Mongo Express (web UI)
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs mongodb

# Access MongoDB shell
docker exec -it chatapp-mongodb mongosh -u admin -p password123

# Remove all data (reset database)
docker-compose down -v
```

## Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   - Ensure Docker is running: `docker --version`
   - Start MongoDB: `docker-compose up -d mongodb`
   - Check container status: `docker-compose ps`
   - View logs: `docker-compose logs mongodb`

2. **CORS Issues**
   - The backend is configured to allow requests from `http://localhost:5173`
   - If using a different port, update the CORS configuration in `server.js`

3. **Video Call Not Working**
   - Ensure your browser supports WebRTC
   - Allow camera and microphone permissions
   - Check that both users are connected to the Socket.IO server

4. **Socket.IO Connection Issues**
   - Check that the backend server is running on port 3001
   - Verify the Socket.IO client is connecting to the correct URL

## Browser Compatibility

- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 79+

Note: WebRTC features require HTTPS in production environments.

## Future Enhancements

- Authentication and authorization
- File sharing
- Group chats
- Screen sharing
- Mobile app using React Native
- Push notifications
- Message encryption



# Find Suitable Instances
```bash
vastai search offers 'compute_cap >= 800 gpu_name=L40S num_gpus=1 static_ip=true direct_port_count > 1 cuda_vers >= 12.4 inet_up>=800 inet_down>=800' -o 'dph+'
```

# Create Model Instances
```bash
# Sailor2 model for text analysis (port 8000)
vastai create instance <instance-id> --image vllm/vllm-openai:latest --env '-p 8000:8000' --disk 64 --args --model fauzanazz/sailor2-fraud-indo-8b-merged

# Qwen2 model for audio analysis (port 8001) 
vastai create instance <instance-id> --image vllm/vllm-openai:latest --env '-p 8001:8000' --disk 64 --args --model fauzanazz/qwen2-audio-indo-fraud-7b-merged
```

# Test Model Endpoints
```bash
# Test Sailor2 text model
curl -X POST http://<Instance-IP-Address>:8000/v1/completions \
  -H "Content-Type: application/json" \
  -d '{"model": "fauzanazz/sailor2-fraud-indo-8b-merged", "prompt": "Hello, how are you?", "max_tokens": 50}'

# Test Qwen2 audio model  
curl -X POST http://<Instance-IP-Address>:8001/v1/completions \
  -H "Content-Type: application/json" \
  -d '{"model": "fauzanazz/qwen2-audio-indo-fraud-7b-merged", "prompt": "Hello, how are you?", "max_tokens": 50}'
```