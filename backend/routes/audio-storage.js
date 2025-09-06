const express = require('express');
const router = express.Router();
const audioProcessor = require('../services/audioProcessor');
const path = require('path');
const fs = require('fs');

/**
 * GET /api/audio/recordings
 * Get list of all saved audio recordings
 */
router.get('/recordings', async (req, res) => {
  try {
    const recordings = await audioProcessor.getSavedRecordings();
    res.json({
      success: true,
      recordings,
      count: recordings.length
    });
  } catch (error) {
    console.error('❌ Error getting recordings:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/audio/recordings/:filename
 * Download a specific audio recording
 */
router.get('/recordings/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    
    // Validate filename to prevent directory traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid filename'
      });
    }

    const recordingsDir = path.join(process.cwd(), 'recordings');
    const filePath = path.join(recordingsDir, filename);
    const metadataFile = path.join(recordingsDir, `${filename}.meta.json`);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'Recording not found'
      });
    }

    // Get metadata if available
    let metadata = null;
    if (fs.existsSync(metadataFile)) {
      try {
        const metadataContent = await fs.promises.readFile(metadataFile, 'utf8');
        metadata = JSON.parse(metadataContent);
      } catch (err) {
        console.warn('⚠️ Could not read metadata file:', err.message);
      }
    }

    // Set appropriate headers for audio download
    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    if (metadata) {
      res.setHeader('X-Recording-Metadata', JSON.stringify(metadata));
    }

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    fileStream.on('error', (error) => {
      console.error('❌ Error streaming file:', error.message);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: 'Error streaming file'
        });
      }
    });

  } catch (error) {
    console.error('❌ Error downloading recording:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/audio/recordings/:filename/metadata
 * Get metadata for a specific recording
 */
router.get('/recordings/:filename/metadata', async (req, res) => {
  try {
    const { filename } = req.params;
    
    // Validate filename
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid filename'
      });
    }

    const recordingsDir = path.join(process.cwd(), 'recordings');
    const metadataFile = path.join(recordingsDir, `${filename}.meta.json`);

    if (!fs.existsSync(metadataFile)) {
      return res.status(404).json({
        success: false,
        error: 'Metadata not found'
      });
    }

    const metadataContent = await fs.promises.readFile(metadataFile, 'utf8');
    const metadata = JSON.parse(metadataContent);

    res.json({
      success: true,
      metadata
    });

  } catch (error) {
    console.error('❌ Error getting metadata:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/audio/recordings/:filename
 * Delete a specific audio recording
 */
router.delete('/recordings/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    
    // Validate filename
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid filename'
      });
    }

    const result = await audioProcessor.deleteSavedRecording(filename);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }

  } catch (error) {
    console.error('❌ Error deleting recording:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/audio/storage/stats
 * Get storage statistics
 */
router.get('/storage/stats', async (req, res) => {
  try {
    const recordings = await audioProcessor.getSavedRecordings();
    
    let totalSize = 0;
    let totalDuration = 0;
    const formatCounts = {};
    const userCounts = {};

    for (const recording of recordings) {
      if (recording.size) totalSize += recording.size;
      if (recording.duration) totalDuration += recording.duration;
      
      // Count by format
      const format = recording.format || 'unknown';
      formatCounts[format] = (formatCounts[format] || 0) + 1;
      
      // Count by user
      const userId = recording.userId || 'unknown';
      userCounts[userId] = (userCounts[userId] || 0) + 1;
    }

    res.json({
      success: true,
      stats: {
        totalRecordings: recordings.length,
        totalSizeBytes: totalSize,
        totalSizeMB: Math.round(totalSize / (1024 * 1024) * 100) / 100,
        totalDurationSeconds: totalDuration,
        totalDurationMinutes: Math.round(totalDuration / 60 * 100) / 100,
        formatBreakdown: formatCounts,
        userBreakdown: userCounts,
        oldestRecording: recordings.length > 0 ? recordings[recordings.length - 1].timestamp : null,
        newestRecording: recordings.length > 0 ? recordings[0].timestamp : null
      }
    });

  } catch (error) {
    console.error('❌ Error getting storage stats:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/audio/cleanup
 * Clean up old recordings (older than specified days)
 */
router.post('/cleanup', async (req, res) => {
  try {
    const { olderThanDays = 30 } = req.body;
    
    if (typeof olderThanDays !== 'number' || olderThanDays < 1) {
      return res.status(400).json({
        success: false,
        error: 'olderThanDays must be a positive number'
      });
    }

    const result = await audioProcessor.cleanupOldRecordings(olderThanDays);
    res.json(result);

  } catch (error) {
    console.error('❌ Error cleaning up recordings:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
