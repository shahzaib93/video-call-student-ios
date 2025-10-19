/**
 * Recording Service for Student App - Jitsi Integration
 * Uses Jitsi's built-in recording capabilities instead of manual screen recording
 */

class RecordingService {
  constructor() {
    this.isRecording = false;
    this.recordingStartTime = null;
    this.callId = null;
    this.userId = null;
    this.eventHandlers = new Map();
    this.recordingMetadata = null;
  }

  // Initialize recording service for Jitsi
  initialize(jitsiMeetingService) {
    try {
      this.jitsiService = jitsiMeetingService;
    } catch (error) {
      console.error('❌ Student failed to initialize recording service:', error);
    }
  }

  // Event handler management
  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(handler);
  }

  off(event, handler) {
    if (this.eventHandlers.has(event)) {
      const handlers = this.eventHandlers.get(event);
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.eventHandlers.has(event)) {
      this.eventHandlers.get(event).forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  // Start recording via Jitsi (student side - recording is controlled by teacher)
  async startRecording(callId, userId) {
    try {
      
      if (this.isRecording) {
        console.warn('⚠️ Student recording already in progress');
        return { success: true, message: 'Recording already in progress' };
      }

      this.callId = callId;
      this.userId = userId;
      this.isRecording = true;
      this.recordingStartTime = new Date();
      
      // Create recording metadata
      this.recordingMetadata = {
        callId,
        userId,
        userType: 'student',
        startTime: this.recordingStartTime,
        platform: 'jitsi'
      };

      this.emit('recording-started', this.recordingMetadata);

      return { 
        success: true, 
        message: 'Recording started via Jitsi',
        metadata: this.recordingMetadata 
      };

    } catch (error) {
      console.error('❌ Student error starting recording:', error);
      this.emit('recording-error', error);
      throw error;
    }
  }

  // Handle recording notification from teacher/Jitsi
  async handleRecordingNotification(recordingData) {
    try {
      
      if (recordingData.action === 'start') {
        await this.startRecording(recordingData.callId, recordingData.studentId);
      } else if (recordingData.action === 'stop') {
        await this.stopRecording();
      }
      
      this.emit('recording-notification', recordingData);
      
    } catch (error) {
      console.error('❌ Student error handling recording notification:', error);
      this.emit('recording-error', error);
    }
  }

  // Stop recording (student side)
  async stopRecording() {
    try {
      
      if (!this.isRecording) {
        console.warn('⚠️ Student: No recording in progress');
        return { success: true, message: 'No recording in progress' };
      }

      this.isRecording = false;
      const endTime = new Date();
      const duration = endTime - this.recordingStartTime;
      
      // Update recording metadata
      if (this.recordingMetadata) {
        this.recordingMetadata.endTime = endTime;
        this.recordingMetadata.duration = duration;
      }

      const recordingSummary = {
        callId: this.callId,
        userId: this.userId,
        userType: 'student',
        startTime: this.recordingStartTime,
        endTime: endTime,
        duration: duration,
        platform: 'jitsi'
      };

      this.emit('recording-stopped', recordingSummary);
      
      return {
        success: true,
        summary: recordingSummary
      };

    } catch (error) {
      console.error('❌ Student error stopping recording:', error);
      this.emit('recording-error', error);
      throw error;
    }
  }

  // Get recording status
  getRecordingStatus() {
    return {
      isRecording: this.isRecording,
      callId: this.callId,
      duration: this.isRecording && this.recordingStartTime ? Date.now() - this.recordingStartTime.getTime() : 0,
      userType: 'student',
      platform: 'jitsi',
      metadata: this.recordingMetadata
    };
  }

  // Recording control (student notifications only - actual control is via Jitsi)
  notifyRecordingPaused() {
    this.emit('recording-paused', { userType: 'student' });
  }

  notifyRecordingResumed() {
    this.emit('recording-resumed', { userType: 'student' });
  }

  // Clean up resources
  cleanup() {
    
    if (this.isRecording) {
      this.stopRecording();
    }
    
    this.callId = null;
    this.userId = null;
    this.recordingStartTime = null;
    this.recordingMetadata = null;
  }

  // Destroy service
  destroy() {
    this.cleanup();
    this.eventHandlers.clear();
  }
}

export default RecordingService;