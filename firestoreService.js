// Firestore Service - Communicates with background.js
class FirestoreService {
  constructor() {
    // No direct db instance needed here.
  }

  // Get collection path for user (can remain client-side)
  getCollectionPath(userId) {
    return `usuarios/${userId}/analises`;
  }

  // Check if URL exists in Firestore - Sends message to background
  async checkUrlInFirestore(userId, url) {
    console.log('FirestoreService: Sending CHECK_URL message to background...');
    const normalizedUrl = this.normalizeUrl(url); // Normalize client-side
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'CHECK_URL',
        userId: userId,
        normalizedUrl: normalizedUrl // Send normalized URL
      });

      console.log('FirestoreService: Received response from background:', response);

      if (response && response.success !== undefined) {
        // Return the structure background provides (exists, data, firestoreId, error)
        return response;
      } else {
        console.error('FirestoreService: Invalid response format from background for CHECK_URL.');
        return { exists: false, data: null, firestoreId: null, error: 'Invalid response from background.' };
      }
    } catch (error) {
      console.error('FirestoreService: Error sending CHECK_URL message or processing response:', error);
       if (error.message.includes("Could not establish connection") || error.message.includes("Receiving end does not exist")) {
          return { exists: false, data: null, firestoreId: null, error: "Error communicating with the extension background. Please reload the extension." };
      }
      return { exists: false, data: null, firestoreId: null, error: error.message || 'Failed to communicate with background script.' };
    }
  }

  // Save or update property data in Firestore - Sends message to background
  async savePropertyData(userId, data) {
    console.log('FirestoreService: Sending SAVE_PROPERTY message to background...');
    // Normalize URL client-side before sending
    const normalizedUrl = this.normalizeUrl(data.link_pag);
    const dataToSend = { ...data, link_pag: normalizedUrl };

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'SAVE_PROPERTY',
        userId: userId,
        data: dataToSend // Send the whole data object
      });

      console.log('FirestoreService: Received response from background:', response);

      if (response && response.success !== undefined) {
         // Return the structure background provides (success, firestoreId, error)
        return response;
      } else {
         console.error('FirestoreService: Invalid response format from background for SAVE_PROPERTY.');
        return { success: false, error: 'Invalid response from background.' };
      }
    } catch (error) {
      console.error('FirestoreService: Error sending SAVE_PROPERTY message or processing response:', error);
      if (error.message.includes("Could not establish connection") || error.message.includes("Receiving end does not exist")) {
          return { success: false, error: "Error communicating with the extension background. Please reload the extension." };
      }
      return { success: false, error: error.message || 'Failed to communicate with background script.' };
    }
  }

  // Normalize URL
  normalizeUrl(url) {
    if (!url) return url;
    let normalizedUrl = url;

    // Remove trailing slashes
    normalizedUrl = normalizedUrl.replace(/\/+$/, '');
    // Remove fragments
    normalizedUrl = normalizedUrl.replace(/#.*$/, '');
    // Remove www.
    normalizedUrl = normalizedUrl.replace(/^https?:\/\/www\./, 'https://');
    normalizedUrl = normalizedUrl.replace(/^http?:\/\/www\./, 'http://');
    // Lowercase the URL
    normalizedUrl = normalizedUrl.toLowerCase();

    return normalizedUrl;
  }
}

// Export the service
export default FirestoreService;
