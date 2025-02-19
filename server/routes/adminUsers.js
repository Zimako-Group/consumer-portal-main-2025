const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');

// Route to delete an admin user
router.post('/deleteAdminUser', async (req, res) => {
  console.log('Received delete request:', req.body);
  
  try {
    const { userId } = req.body;
    console.log('UserID to delete:', userId);

    if (!userId) {
      console.log('No userId provided');
      return res.status(400).json({ 
        success: false,
        message: 'User ID is required' 
      });
    }

    // Delete the user from Firebase Auth
    console.log('Attempting to delete user from Firebase Auth...');
    await admin.auth().deleteUser(userId);
    console.log('User deleted from Firebase Auth successfully');

    res.status(200).json({ 
      success: true,
      message: 'User deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ 
      success: false,
      message: error.message || 'Failed to delete user',
      error: error.toString()
    });
  }
});

module.exports = router;
