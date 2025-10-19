import { db, auth } from '../config/firebase';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';

class CallService {
  constructor() {
    this.auth = auth;
    this.callsCollection = collection(db, 'calls');
  }

  /**
   * Log the start of a call
   */
  async startCall(teacherId, teacherName, callType = 'video') {
    try {
      const currentUser = this.auth.currentUser;
      if (!currentUser) {
        throw new Error('User must be authenticated to start a call');
      }

      const callData = {
        studentId: currentUser.uid,
        teacherId: teacherId,
        teacherName: teacherName || 'Unknown Teacher',
        callType: callType, // 'video', 'audio'
        status: 'started',
        startTime: serverTimestamp(),
        endTime: null,
        duration: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(this.callsCollection, callData);
      
      return {
        success: true,
        callId: docRef.id,
        call: { id: docRef.id, ...callData }
      };
    } catch (error) {
      console.error('❌ Error starting call log:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Log the end of a call
   */
  async endCall(callId, endReason = 'completed') {
    try {
      if (!callId) {
        console.warn('No call ID provided to end call');
        return { success: false, error: 'Call ID required' };
      }

      const endTime = Timestamp.now();
      const callRef = doc(this.callsCollection, callId);
      
      // Note: We can't easily calculate duration without the start time from Firestore
      // For now, we'll let the client calculate and provide it
      const updateData = {
        status: endReason === 'rejected' ? 'rejected' : 'completed',
        endTime: endTime,
        endReason: endReason,
        updatedAt: serverTimestamp()
      };

      await updateDoc(callRef, updateData);
      
      return {
        success: true,
        callId: callId
      };
    } catch (error) {
      console.error('❌ Error ending call:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update call duration (called by client with calculated duration)
   */
  async updateCallDuration(callId, durationInSeconds) {
    try {
      if (!callId) return { success: false, error: 'Call ID required' };

      const callRef = doc(this.callsCollection, callId);
      await updateDoc(callRef, {
        duration: durationInSeconds,
        updatedAt: serverTimestamp()
      });

      return { success: true };
    } catch (error) {
      console.error('❌ Error updating call duration:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get total count of calls for current student
   */
  async getMyCallCount(statusFilter = 'all') {
    try {
      const currentUser = this.auth.currentUser;
      if (!currentUser) {
        return { success: false, error: 'User must be authenticated' };
      }

      let q;
      if (statusFilter === 'all') {
        q = query(
          this.callsCollection,
          where('studentId', '==', currentUser.uid)
        );
      } else {
        q = query(
          this.callsCollection,
          where('studentId', '==', currentUser.uid),
          where('status', '==', statusFilter)
        );
      }

      const querySnapshot = await getDocs(q);
      return {
        success: true,
        count: querySnapshot.size
      };
    } catch (error) {
      console.error('❌ Error getting call count:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get call history for current student with pagination
   */
  async getMyCallHistory(limitCount = 10, page = 1, statusFilter = 'all') {
    try {
      const currentUser = this.auth.currentUser;
      if (!currentUser) {
        return { success: false, error: 'User must be authenticated' };
      }

      const offset = (page - 1) * limitCount;

      let q;
      if (statusFilter === 'all') {
        q = query(
          this.callsCollection,
          where('studentId', '==', currentUser.uid),
          orderBy('startTime', 'desc'),
          limit(limitCount + offset) // Get all records up to current page
        );
      } else {
        q = query(
          this.callsCollection,
          where('studentId', '==', currentUser.uid),
          where('status', '==', statusFilter),
          orderBy('startTime', 'desc'),
          limit(limitCount + offset) // Get all records up to current page
        );
      }

      const querySnapshot = await getDocs(q);
      const allCalls = querySnapshot.docs.map(doc => ({
        id: doc.id,
        callId: doc.id, // Add callId for compatibility
        ...doc.data(),
        // Convert Firestore timestamps to JavaScript dates
        startTime: doc.data().startTime?.toDate(),
        endTime: doc.data().endTime?.toDate(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
      }));

      // Get only the calls for current page
      const calls = allCalls.slice(offset, offset + limitCount);

      return {
        success: true,
        calls: calls
      };
    } catch (error) {
      console.error('❌ Error getting call history:', error);
      return {
        success: false,
        error: error.message,
        calls: []
      };
    }
  }

  /**
   * Calculate call statistics for current user
   */
  async getMyCallStats() {
    try {
      const callHistoryResult = await this.getMyCallHistory(1000, 1, 'all'); // Get more calls for stats
      
      if (!callHistoryResult.success) {
        return callHistoryResult;
      }

      const calls = callHistoryResult.calls;
      const now = new Date();
      
      // Calculate total calls (all time)
      const totalCalls = calls.length;
      
      // Calculate calls this week (Monday to Sunday)
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay() + 1); // Monday
      startOfWeek.setHours(0, 0, 0, 0);
      
      const callsThisWeek = calls.filter(call => 
        call.startTime && call.startTime >= startOfWeek
      ).length;
      
      // Calculate calls this month
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const callsThisMonth = calls.filter(call => 
        call.startTime && call.startTime >= startOfMonth
      ).length;
      
      // Calculate success rate (ended calls are successful)
      const completedCalls = calls.filter(call => call.status === 'ended' || call.status === 'completed').length;
      const successRate = totalCalls > 0 ? Math.round((completedCalls / totalCalls) * 100) : 0;

      // Calculate durations
      const completedCallsWithDuration = calls.filter(call => 
        (call.status === 'ended' || call.status === 'completed') && call.duration
      );
      const totalDuration = completedCallsWithDuration.reduce((sum, call) => sum + (call.duration || 0), 0);
      const averageDuration = completedCallsWithDuration.length > 0 ? totalDuration / completedCallsWithDuration.length : 0;

      const stats = {
        totalCalls,
        callsThisWeek,
        callsThisMonth,
        successRate, // percentage
        // Legacy fields for backward compatibility
        successfulCalls: completedCalls,
        rejectedCalls: calls.filter(call => call.status === 'rejected').length,
        failedCalls: calls.filter(call => call.status === 'failed').length,
        totalDuration: totalDuration,
        averageDuration: averageDuration,
        totalRecordingSize: calls.reduce((sum, call) => {
          return sum + ((call.recording && call.recording.totalSize) ? call.recording.totalSize : 0);
        }, 0)
      };

      return {
        success: true,
        stats: stats
      };
    } catch (error) {
      console.error('❌ Error calculating call stats:', error);
      return {
        success: false,
        error: error.message,
        stats: {
          totalCalls: 0,
          callsThisWeek: 0,
          callsThisMonth: 0,
          successRate: 0,
          successfulCalls: 0,
          rejectedCalls: 0,
          failedCalls: 0,
          totalDuration: 0,
          averageDuration: 0,
          totalRecordingSize: 0
        }
      };
    }
  }
}

export default new CallService();