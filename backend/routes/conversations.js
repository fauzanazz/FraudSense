const express = require('express');
const router = express.Router();
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');

router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    let conversations = await Conversation.find({
      participants: userId
    })
    .populate('participants', 'username')
    .sort({ lastMessageTime: -1 });

    // Backfill lastMessage/lastMessageTime if missing based on latest message
    const withBackfilled = await Promise.all(conversations.map(async (conv) => {
      if (!conv.lastMessage) {
        const lastMsg = await Message.findOne({ conversationId: conv._id })
          .sort({ timestamp: -1 });
        if (lastMsg) {
          conv.lastMessage = lastMsg.content;
          conv.lastMessageTime = lastMsg.timestamp;
          try {
            await conv.save();
          } catch (e) {
            console.warn('Failed to backfill conversation preview', conv._id.toString(), e.message);
          }
        }
      }
      return conv;
    }));
    
    res.json(withBackfilled);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { participants } = req.body;
    
    const existingConversation = await Conversation.findOne({
      participants: { $all: participants, $size: participants.length }
    });
    
    if (existingConversation) {
      const populatedExisting = await Conversation.findById(existingConversation._id)
        .populate('participants', 'username');
      return res.json(populatedExisting);
    }
    
    const newConversation = new Conversation({
      participants
    });
    
    await newConversation.save();
    
    const populatedConversation = await Conversation.findById(newConversation._id)
      .populate('participants', 'username');
    
    res.status(201).json(populatedConversation);
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

module.exports = router;