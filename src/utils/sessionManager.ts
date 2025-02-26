/**
 * Session Manager Utility
 * 
 * Handles user session timeout functionality for the application.
 * Automatically logs out users after a specified period of inactivity.
 */

// Default timeout in milliseconds (5 minutes)
const DEFAULT_TIMEOUT = 5 * 60 * 1000;

type SessionTimeoutCallback = () => void;

class SessionManager {
  private timeoutId: number | null = null;
  private timeoutDuration: number;
  private callback: SessionTimeoutCallback;
  private lastActivity: number = Date.now();
  private eventsBound: boolean = false;
  private activityEvents: string[] = [
    'mousedown', 'mousemove', 'keypress', 
    'scroll', 'touchstart', 'click', 'keydown'
  ];

  /**
   * Initialize the session manager
   * @param callback Function to call when session times out
   * @param timeoutDuration Timeout duration in milliseconds (default: 5 minutes)
   */
  constructor(callback: SessionTimeoutCallback, timeoutDuration: number = DEFAULT_TIMEOUT) {
    this.callback = callback;
    this.timeoutDuration = timeoutDuration;
    // Explicitly bind methods to ensure 'this' context is preserved
    this.handleUserActivity = this.handleUserActivity.bind(this);
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
    this.resetTimer = this.resetTimer.bind(this);
  }

  /**
   * Start monitoring user activity and session timeout
   */
  public startMonitoring(): void {
    this.lastActivity = Date.now(); // Reset last activity time when starting
    this.resetTimer();
    
    if (!this.eventsBound) {
      // Track user activity
      this.activityEvents.forEach(event => {
        window.addEventListener(event, this.handleUserActivity);
      });
      
      // Also reset on visibility change (tab focus)
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
      
      this.eventsBound = true;
      console.log('Session timeout monitoring started with duration:', this.timeoutDuration, 'ms');
    }
  }

  /**
   * Stop monitoring user activity
   */
  public stopMonitoring(): void {
    if (this.timeoutId !== null) {
      window.clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    
    if (this.eventsBound) {
      this.activityEvents.forEach(event => {
        window.removeEventListener(event, this.handleUserActivity);
      });
      
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
      
      this.eventsBound = false;
      console.log('Session timeout monitoring stopped');
    }
  }

  /**
   * Reset the timeout timer
   */
  public resetTimer(): void {
    this.lastActivity = Date.now();
    
    if (this.timeoutId !== null) {
      window.clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    
    this.timeoutId = window.setTimeout(() => {
      const now = Date.now();
      const timeSinceLastActivity = now - this.lastActivity;
      
      console.log('Checking session timeout:', {
        timeSinceLastActivity,
        timeoutDuration: this.timeoutDuration,
        shouldTimeout: timeSinceLastActivity >= this.timeoutDuration
      });
      
      if (timeSinceLastActivity >= this.timeoutDuration) {
        console.log('Session timed out due to inactivity');
        this.callback();
      } else {
        // If user was active during timeout period, reset timer
        this.resetTimer();
      }
    }, this.timeoutDuration);
  }

  /**
   * Handle user activity events
   */
  private handleUserActivity(): void {
    this.lastActivity = Date.now();
    this.resetTimer();
  }

  /**
   * Handle visibility change (tab focus/blur)
   */
  private handleVisibilityChange(): void {
    if (document.visibilityState === 'visible') {
      // Check if session should be timed out when tab becomes visible again
      const now = Date.now();
      const timeSinceLastActivity = now - this.lastActivity;
      
      if (timeSinceLastActivity >= this.timeoutDuration) {
        console.log('Session timed out while tab was inactive');
        this.callback();
      } else {
        this.resetTimer();
      }
    }
  }
}

export default SessionManager;
