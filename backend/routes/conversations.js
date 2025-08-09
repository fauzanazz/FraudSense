const express = require('express');
const router = express.Router();
const Conversation = require('../models/Conversation');
const User = require('../models/User');

router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const conversations = await Conversation.find({
      participants: userId
    })
    .populate('participants', 'username')
    .sort({ lastMessageTime: -1 });
    
    res.json(conversations);
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