// Authentication Service - Communicates with background.js
class AuthService {
  constructor() {
    // No direct auth instance needed here. State managed via background communication.
    this.currentUser = null; // May need a way to get/update this from background
    this.authStateListeners = []; // May need adjustment based on background communication
    
    // TODO: Implement a way to listen for auth state changes from the background script
    // This might involve setting up a long-lived port connection or specific messages.
  }

  // Get current user - Fetches from background or returns cached user
  async getCurrentUser() {
    // Return cached user if available
    if (this.currentUser) {
      return this.currentUser;
    }
    // Otherwise, request from background
    console.log("AuthService: Requesting current user from background...");
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_CURRENT_USER' });
      console.log("AuthService: Received current user response:", response);
      if (response && response.success) {
        this.currentUser = response.user; // Cache the user
        return this.currentUser;
      } else {
        console.error("AuthService: Failed to get current user from background:", response?.error);
        return null;
      }
    } catch (error) {
      console.error("AuthService: Error requesting current user:", error);
      return null;
    }
  }

  // Add auth state change listener
  onAuthStateChanged(callback) {
    this.authStateListeners.push(callback);
    // Return unsubscribe function
    return () => {
      this.authStateListeners = this.authStateListeners.filter(cb => cb !== callback);
    };
  }

  // Notify all listeners about auth state change
  notifyAuthStateListeners(user) {
    this.authStateListeners.forEach(callback => {
      try {
        callback(user);
      } catch (error) {
        console.error('Error in auth state listener:', error);
      }
    });
  }

  // Sign in with email and password - Sends message to background script
  async signIn(email, password) {
    console.log('AuthService: Sending SIGN_IN message to background...');
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'SIGN_IN',
        email: email,
        password: password
      });

      console.log('AuthService: Received response from background:', response);

      if (response && response.success) {
        // Update local currentUser state after successful sign-in
        this.currentUser = response.user || null; 
        this.notifyAuthStateListeners(this.currentUser); 
        console.log("AuthService: User state updated after sign-in:", this.currentUser);
        return { success: true, user: this.currentUser };
      } else {
        // Use error message from background response if available
        const errorMessage = response?.error || 'Unknown sign-in error from background.';
        console.error('AuthService: Sign in failed:', errorMessage);
        return { success: false, error: errorMessage };
      }
    } catch (error) {
      // This catches errors in sending the message or if the background script isn't running
      console.error('AuthService: Error sending message to background or processing response:', error);
      // Check for specific Chrome runtime errors
      if (error.message.includes("Could not establish connection") || error.message.includes("Receiving end does not exist")) {
          return { success: false, error: "Error communicating with the extension background. Please reload the extension." };
      }
      return { success: false, error: error.message || 'Failed to communicate with background script.' };
    }
  }

  // Sign up with email and password - TODO: Needs background communication
  async signUp(email, password) {
    try {
      console.log('Attempting to sign up...');
      const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
      console.log('Sign up successful:', userCredential.user.email);
      return { success: true, user: userCredential.user };
    } catch (error) {
      console.error('Error signing up:', error);
      return { success: false, error: error.message };
    }
  }

  // Sign out - Sends message to background script
  async signOut() {
    console.log('AuthService: Sending SIGN_OUT message to background...');
    try {
      const response = await chrome.runtime.sendMessage({ type: 'SIGN_OUT' });
      console.log('AuthService: Received sign-out response:', response);
      if (response && response.success) {
        this.currentUser = null; // Clear local user state
        this.notifyAuthStateListeners(null);
        return { success: true };
      } else {
        console.error('AuthService: Sign out failed:', response?.error);
        return { success: false, error: response?.error || 'Unknown sign-out error from background.' };
      }
    } catch (error) {
      console.error('AuthService: Error sending sign-out message:', error);
      return { success: false, error: error.message || 'Failed to communicate with background script for sign-out.' };
    }
  }

  // Check if user is authenticated (uses cached state)
  isAuthenticated() {
    // This relies on the currentUser being updated correctly by signIn, signOut, or getCurrentUser
    return !!this.currentUser;
  }

  // Reset password - TODO: Needs background communication
  async resetPassword(email) {
    try {
      await this.auth.sendPasswordResetEmail(email);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

// Export the service
export default AuthService;
