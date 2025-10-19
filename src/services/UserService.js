import { db, auth } from '../config/firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';

class UserService {
  constructor() {
    this.usersCollection = collection(db, 'users');
    this.auth = auth;
  }

  // Get user by ID
  async getUserById(userId) {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      
      if (!userDoc.exists()) {
        return {
          success: false,
          error: 'User not found'
        };
      }
      
      return {
        success: true,
        user: {
          id: userDoc.id,
          ...userDoc.data()
        }
      };
    } catch (error) {
      console.error('Error fetching user:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get the assigned teacher for the current student
  async getMyTeacher(studentId) {
    try {
      // First, get the current student's data to find their assigned teacher
      const studentDoc = await getDoc(doc(db, 'users', studentId));
      
      if (!studentDoc.exists()) {
        return {
          success: false,
          error: 'Student not found'
        };
      }

      const studentData = studentDoc.data();
      const assignedTeacherId = studentData.assignedTeacher;

      if (!assignedTeacherId) {
        return {
          success: false,
          error: 'No teacher assigned to this student'
        };
      }

      // Get the teacher's data
      const teacherDoc = await getDoc(doc(db, 'users', assignedTeacherId));
      
      if (!teacherDoc.exists()) {
        return {
          success: false,
          error: 'Assigned teacher not found'
        };
      }

      const teacherData = teacherDoc.data();
      

      return {
        success: true,
        teacher: {
          id: teacherDoc.id,
          ...teacherData
        }
      };
    } catch (error) {
      console.error('Error fetching assigned teacher:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get all users (for admin purposes)
  async getAllUsers() {
    try {
      const q = query(
        this.usersCollection,
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const users = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      return {
        success: true,
        users: users
      };
    } catch (error) {
      console.error('Error fetching users:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get users by role
  async getUsersByRole(role) {
    try {
      const q = query(
        this.usersCollection, 
        where('role', '==', role),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const users = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      return {
        success: true,
        users: users
      };
    } catch (error) {
      console.error(`Error fetching users with role ${role}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update user's online status
   */
  async setOnlineStatus(isOnline = true) {
    try {
      const currentUser = this.auth.currentUser;
      if (!currentUser) {
        console.warn('❌ Cannot set online status: No authenticated user');
        return { success: false, error: 'User must be authenticated' };
      }

      
      const userRef = doc(this.usersCollection, currentUser.uid);
      await updateDoc(userRef, {
        isOnline: isOnline,
        lastSeen: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      return { success: true };
    } catch (error) {
      console.error('❌ Error updating online status:', error);
      console.error('❌ Error details:', {
        code: error.code,
        message: error.message,
        userId: this.auth.currentUser?.uid
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Set user online
   */
  async setOnline() {
    return this.setOnlineStatus(true);
  }

  /**
   * Set user offline
   */
  async setOffline() {
    return this.setOnlineStatus(false);
  }

  /**
   * Setup automatic online/offline status tracking
   */
  setupOnlineStatusTracking() {
    const currentUser = this.auth.currentUser;
    if (!currentUser) {
      console.warn('❌ Cannot setup online tracking: user not authenticated');
      return;
    }

    const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

    // Store interval ID for cleanup
    let heartbeatInterval = null;

    // Set online when app becomes visible
    const handleOnline = () => {
      this.setOnline();
    };

    // Set offline when app becomes hidden or closed
    const handleOffline = () => {
      this.setOffline();
    };

    // Browser events for online/offline
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('beforeunload', handleOffline);
    
    // Page visibility changes - REMOVED: Too restrictive
    // We don't want to set offline just because user clicked outside the app
    // Only track actual logout, window close, or network offline events

    // Set initial online status
    this.setOnline();
    
    // Setup heartbeat to update lastSeen while user is active
    heartbeatInterval = setInterval(async () => {
      try {
        const userRef = doc(this.usersCollection, currentUser.uid);
        await updateDoc(userRef, {
          lastSeen: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      } catch (error) {
        console.error('💓 Heartbeat update failed:', error);
      }
    }, HEARTBEAT_INTERVAL_MS);


    // Return cleanup function
    return () => {
      // Clear heartbeat interval
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
      
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeunload', handleOffline);
      this.setOffline();
    };
  }
}

export default new UserService();
