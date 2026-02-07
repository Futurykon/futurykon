import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ActivityTrackerOptions {
  /** Timeout in minutes before considering user inactive (default: 30) */
  inactivityTimeout?: number;
  /** How often to refresh session when user is active in minutes (default: 45) */
  refreshInterval?: number;
}

export const useActivityTracker = ({ 
  inactivityTimeout = 30, 
  refreshInterval = 45 
}: ActivityTrackerOptions = {}) => {
  const lastActivityRef = useRef(Date.now());
  const refreshIntervalRef = useRef<NodeJS.Timeout>();
  const inactivityTimeoutRef = useRef<NodeJS.Timeout>();

  const updateActivity = () => {
    lastActivityRef.current = Date.now();
    
    // Clear existing timeout
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
    }
    
    // Set new inactivity timeout
    inactivityTimeoutRef.current = setTimeout(() => {
      // User is inactive - let session expire naturally
      console.log('User inactive - session will expire naturally');
    }, inactivityTimeout * 60 * 1000);
  };

  const refreshSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Check if user has been active recently
        const timeSinceActivity = Date.now() - lastActivityRef.current;
        const activityThreshold = (inactivityTimeout / 2) * 60 * 1000; // Half of inactivity timeout
        
        if (timeSinceActivity < activityThreshold) {
          await supabase.auth.refreshSession();
          console.log('Session refreshed due to user activity');
        }
      }
    } catch (error) {
      console.error('Error refreshing session:', error);
    }
  };

  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    // Add activity listeners
    events.forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true });
    });

    // Set up periodic session refresh
    refreshIntervalRef.current = setInterval(refreshSession, refreshInterval * 60 * 1000);

    // Initial activity update
    updateActivity();

    return () => {
      // Cleanup
      events.forEach(event => {
        document.removeEventListener(event, updateActivity);
      });
      
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
      }
    };
  }, [inactivityTimeout, refreshInterval]);

  return {
    updateActivity,
    lastActivity: lastActivityRef.current,
  };
};