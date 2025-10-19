import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc,
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  getDocs,
  getDoc,
  setDoc
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';

class MessageService {
  constructor() {
    this.db = db;
    this.auth = auth;
    this.messagesCollection = collection(db, 'messages');
    this.conversationsCollection = collection(db, 'conversations');
  }

  /**
   * Send a message to another user
   * @param {string} receiverId - Firebase UID of receiver
   * @param {string} content - Message content
   * @param {string} type - Message type (text, image, etc.)
   * @param {Object} metadata - Additional message metadata
   * @returns {Promise<Object>} Success/failure result
   */
  async sendMessage(receiverId, content, type = 'text', metadata = {}) {
    try {
      const currentUser = this.auth.currentUser;
      if (!currentUser) {
        throw new Error('User must be authenticated to send messages');
      }


      // Get sender and receiver info
      const [senderDoc, receiverDoc] = await Promise.all([
        getDoc(doc(db, 'users', currentUser.uid)),
        getDoc(doc(db, 'users', receiverId))
      ]);

      if (!senderDoc.exists() || !receiverDoc.exists()) {
        throw new Error('User not found');
      }

      const senderData = senderDoc.data();
      const receiverData = receiverDoc.data();

      // Create or get conversation
      const conversationId = await this.createOrGetConversation(
        currentUser.uid, 
        receiverId,
        senderData,
        receiverData
      );

      // Create message document
      const messageData = {
        senderId: currentUser.uid,
        receiverId: receiverId,
        content: content.trim(),
        type: type,
        conversationId: conversationId,
        senderRole: senderData.role || 'student',
        receiverRole: receiverData.role || 'teacher',
        timestamp: serverTimestamp(),
        createdAt: new Date().toISOString(),
        isRead: false,
        metadata: {
          senderName: senderData.username || senderData.name || 'Unknown',
          receiverName: receiverData.username || receiverData.name || 'Unknown',
          ...metadata
        }
      };

      // Add message to Firestore
      const docRef = await addDoc(this.messagesCollection, messageData);
      
      // Update conversation last message
      await this.updateConversationLastMessage(conversationId, content, currentUser.uid);


      return {
        success: true,
        messageId: docRef.id,
        conversationId: conversationId,
        message: 'Message sent successfully'
      };

    } catch (error) {
      console.error('❌ Failed to send message:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create or get existing conversation between two users
   * @param {string} user1Id - First user ID
   * @param {string} user2Id - Second user ID
   * @param {Object} user1Data - First user data
   * @param {Object} user2Data - Second user data
   * @returns {Promise<string>} Conversation ID
   */
  async createOrGetConversation(user1Id, user2Id, user1Data, user2Data) {
    // Create deterministic conversation ID
    const participants = [user1Id, user2Id].sort();
    const conversationId = participants.join('_');

    try {
      // Check if conversation exists
      const conversationDoc = await getDoc(doc(db, 'conversations', conversationId));
      
      if (!conversationDoc.exists()) {
        // Create new conversation
        const conversationData = {
          id: conversationId,
          participants: participants,
          participantRoles: [user1Data.role || 'student', user2Data.role || 'teacher'],
          participantNames: [
            user1Data.username || user1Data.name || 'Unknown',
            user2Data.username || user2Data.name || 'Unknown'
          ],
          lastMessage: '',
          lastMessageTime: serverTimestamp(),
          createdAt: serverTimestamp(),
          unreadCount: {
            [user1Id]: 0,
            [user2Id]: 0
          }
        };

        await setDoc(doc(db, 'conversations', conversationId), conversationData);
      }

      return conversationId;
    } catch (error) {
      console.error('❌ Error creating/getting conversation:', error);
      throw error;
    }
  }

  /**
   * Update conversation's last message
   * @param {string} conversationId - Conversation ID
   * @param {string} lastMessage - Last message content
   * @param {string} senderId - Sender ID
   */
  async updateConversationLastMessage(conversationId, lastMessage, senderId) {
    try {
      const conversationRef = doc(db, 'conversations', conversationId);
      const conversationDoc = await getDoc(conversationRef);
      
      if (conversationDoc.exists()) {
        const data = conversationDoc.data();
        const unreadCount = { ...data.unreadCount };
        
        // Increment unread count for all participants except sender
        data.participants.forEach(participantId => {
          if (participantId !== senderId) {
            unreadCount[participantId] = (unreadCount[participantId] || 0) + 1;
          }
        });

        await updateDoc(conversationRef, {
          lastMessage: lastMessage.substring(0, 100), // Truncate for preview
          lastMessageTime: serverTimestamp(),
          unreadCount: unreadCount
        });
      }
    } catch (error) {
      console.error('❌ Error updating conversation:', error);
    }
  }

  /**
   * Get conversations for current user with real-time updates
   * @param {Function} callback - Callback function for updates
   * @returns {Function} Unsubscribe function
   */
  getConversations(callback) {
    const currentUser = this.auth.currentUser;
    if (!currentUser) {
      console.error('User must be authenticated to get conversations');
      callback([]);
      return () => {};
    }


    const q = query(
      this.conversationsCollection,
      where('participants', 'array-contains', currentUser.uid),
      orderBy('lastMessageTime', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      // Check if user is still authenticated when snapshot arrives
      if (!this.auth.currentUser) {
        callback([]);
        return;
      }
      
      const conversations = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      callback(conversations);
    }, (error) => {
      console.error('❌ Error listening to conversations:', error);
      // Check if it's a permission error due to logout
      if (error.code === 'permission-denied') {
      }
      callback([]);
    });
  }

  /**
   * Get messages for a specific conversation with real-time updates
   * @param {string} conversationId - Conversation ID
   * @param {Function} callback - Callback function for updates
   * @returns {Function} Unsubscribe function
   */
  getMessages(conversationId, callback) {
    if (!conversationId) {
      console.error('Conversation ID is required');
      callback([]);
      return () => {};
    }

    const currentUser = this.auth.currentUser;
    if (!currentUser) {
      console.error('User must be authenticated to get messages');
      callback([]);
      return () => {};
    }


    const q = query(
      this.messagesCollection,
      where('conversationId', '==', conversationId),
      orderBy('timestamp', 'asc')
    );

    return onSnapshot(q, (snapshot) => {
      // Check if user is still authenticated when snapshot arrives
      if (!this.auth.currentUser) {
        callback([]);
        return;
      }
      
      const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      callback(messages);
    }, (error) => {
      console.error('❌ Error listening to messages:', error);
      // Check if it's a permission error due to logout
      if (error.code === 'permission-denied') {
      }
      callback([]);
    });
  }

  /**
   * Mark messages as read
   * @param {string} conversationId - Conversation ID
   * @param {string} userId - User ID who read the messages
   */
  async markAsRead(conversationId, userId = null) {
    try {
      const currentUser = this.auth.currentUser;
      const readerId = userId || currentUser?.uid;
      
      if (!readerId) {
        throw new Error('User must be authenticated');
      }


      // Get unread messages for this user
      const q = query(
        this.messagesCollection,
        where('conversationId', '==', conversationId),
        where('receiverId', '==', readerId),
        where('isRead', '==', false)
      );

      const snapshot = await getDocs(q);
      const batch = [];

      // Mark all unread messages as read
      snapshot.docs.forEach(doc => {
        batch.push(updateDoc(doc.ref, { isRead: true }));
      });

      if (batch.length > 0) {
        await Promise.all(batch);
        
        // Reset unread count in conversation
        const conversationRef = doc(db, 'conversations', conversationId);
        const conversationDoc = await getDoc(conversationRef);
        
        if (conversationDoc.exists()) {
          const data = conversationDoc.data();
          const unreadCount = { ...data.unreadCount };
          unreadCount[readerId] = 0;

          await updateDoc(conversationRef, { unreadCount });
        }

      }

      return {
        success: true,
        markedCount: batch.length
      };

    } catch (error) {
      console.error('❌ Error marking messages as read:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get recent messages for dashboard stats
   * @param {number} limit - Number of recent messages to get
   * @returns {Promise<Object>} Messages and stats
   */
  async getRecentMessages(limit = 10) {
    try {
      const currentUser = this.auth.currentUser;
      if (!currentUser) {
        return { success: false, error: 'User not authenticated' };
      }

      const q = query(
        this.messagesCollection,
        where('receiverId', '==', currentUser.uid),
        orderBy('timestamp', 'desc'),
        // Note: Firestore limit function would be imported separately
      );

      const snapshot = await getDocs(q);
      const messages = snapshot.docs.slice(0, limit).map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      const unreadCount = messages.filter(msg => !msg.isRead).length;

      return {
        success: true,
        messages: messages,
        totalCount: messages.length,
        unreadCount: unreadCount
      };

    } catch (error) {
      console.error('❌ Error getting recent messages:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default new MessageService();