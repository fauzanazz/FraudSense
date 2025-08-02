// MongoDB initialization script
db = db.getSiblingDB('chatapp');

// Create a user for the chatapp database
db.createUser({
  user: 'chatapp_user',
  pwd: 'chatapp_password',
  roles: [
    {
      role: 'readWrite',
      db: 'chatapp'
    }
  ]
});

// Create collections with initial indexes
db.createCollection('users');
db.createCollection('conversations');
db.createCollection('messages');

// Create indexes for better performance
db.users.createIndex({ "username": 1 }, { unique: true });
db.conversations.createIndex({ "participants": 1 });
db.messages.createIndex({ "conversationId": 1, "timestamp": 1 });

print('Database chatapp initialized with user and collections');