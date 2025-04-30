// Import Firebase SDKs directly (compat version)
import '../../lib/firebase-app.js';
import '../../lib/firebase-auth.js';
import '../../lib/firebase-firestore.js';

// Import config
import { firebaseConfig } from '../../lib/firebase-init.js';

// Initialize Firebase ONLY in the background script
let app;
let auth;
let db;

// Async function to handle initialization and persistence setting
async function initializeFirebase() {
  // Use self.firebase as the compat libraries load into the global scope
  if (!self.firebase.apps.length) {
    app = self.firebase.initializeApp(firebaseConfig);
    console.log('Firebase initialized in background.');
  } else {
    app = self.firebase.app(); // Get existing app
    console.log('Firebase already initialized in background.');
  }
  // Explicitly pass the app instance to getAuth and getFirestore
  auth = self.firebase.auth(app);
  // Note: firebase.auth.Auth.Persistence.LOCAL is not supported in Service Workers.
  // Persistence will use the default for this environment (likely 'NONE' or 'SESSION').
  db = self.firebase.firestore(app);
  console.log('Firebase auth and firestore instances obtained in background.');
  return { app, auth, db }; // Return the instances
}

// Promise to ensure Firebase is initialized before use
const firebaseReadyPromise = new Promise((resolve, reject) => {
  initializeFirebase()
    .then(resolve) // Resolve the promise with the instances
    .catch(error => {
      console.error('Error initializing Firebase in background.js:', error);
      // Prevent the extension from loading incorrectly
      reject(error); // Reject the promise on error
      // Optionally re-throw if needed elsewhere, but rejection is usually sufficient
      // throw error; 
    });
});


// Background Service Worker

// Function to check if a URL exists in the leiloeiros.csv list
async function isUrlInLeiloeirosCsv(url) {
  try {
    // firebase-init.js handles initialization on import
    
    // Get domain from URL
    const domain = getDomainFromUrl(url);
    if (!domain) return false;
    
    // First check cache
    const cache = await chrome.storage.local.get('leiloeirosDomains');
    if (cache.leiloeirosDomains) {
      return cache.leiloeirosDomains.includes(domain);
    }
    
    // If not in cache, load from CSV
    const response = await fetch(chrome.runtime.getURL('data/leiloeiros.csv'));
    const csvText = await response.text();
    const lines = csvText.split('\n').slice(1); // Skip the first line (header row)
    
    // Extract domains from URLs in the CSV
    const domains = lines.map(line => {
      const url = line.replace(/"/g, '').trim();
      return url ? getDomainFromUrl(url) : null;
    }).filter(domain => domain !== null);
    
    // Cache domains for future checks
    await chrome.storage.local.set({ leiloeirosDomains: domains });
    
    return domains.includes(domain);
  } catch (error) {
    console.error('Error checking URL in leiloeiros.csv:', error);
    return false;
  }
}

// Helper function to get domain from URL
function getDomainFromUrl(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, ''); // remove "www." part if it exists
  } catch (error) {
    console.error('Invalid URL:', url);
    return null;
  }
}

// Function to analyze property via n8n
async function analyzeProperty(url) {
  try {
    console.log('Sending request to n8n...');
    const response = await fetch('https://n8n-n8n.apuc7z.easypanel.host/webhook/extrair-imovel', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url })
    });

    if (!response.ok) {
      throw new Error(`Error in request: ${response.status}`);
    }

    const data = await response.json();
    console.log('Response from n8n:', data);

    if (data.error) {
      throw new Error(data.error);
    }

    return {
      success: true,
      data: data
    };
  } catch (error) {
    console.error('Error analyzing property:', error);
    return {
      success: false,
      error: error.message || 'Error analyzing property'
    };
  }
}

// Port connection management for long-running tasks/streaming
// let currentPort = null; // This was duplicated, removing first instance
let analysisResult = null; // Keep track of analysis results if needed

// --- Firebase Auth Handler ---
async function handleSignIn(email, password) {
  try {
    await auth.signInWithEmailAndPassword(email, password);
    console.log('Background: Sign in successful for', email);
    return { success: true, user: auth.currentUser }; // Consider what user info popup needs
  } catch (error) {
    console.error('Background: Sign in error:', error);
    return { success: false, error: error.message };
  }
}

// --- Firestore Handlers (called by message listener) ---

// Helper to get collection path
function getFirestoreCollectionPath(userId) {
  return `usuarios/${userId}/analises`;
}

// Helper to normalize URL (can be shared or kept here)
function normalizeFirestoreUrl(url) {
    if (!url) return url;
    let normalizedUrl = url;
    normalizedUrl = normalizedUrl.replace(/\/+$/, '');
    normalizedUrl = normalizedUrl.replace(/#.*$/, '');
    normalizedUrl = normalizedUrl.replace(/^https?:\/\/www\./, 'https://');
    normalizedUrl = normalizedUrl.replace(/^http?:\/\/www\./, 'http://');
    normalizedUrl = normalizedUrl.toLowerCase();
    return normalizedUrl;
}


async function handleCheckUrl(userId, normalizedUrl) {
  console.log(`Background: Checking URL ${normalizedUrl} for user ${userId}`);
  const collectionPath = getFirestoreCollectionPath(userId);
  try {
    // Check primary URL
    let querySnapshot = await db.collection(collectionPath)
      .where('link_pag', '==', normalizedUrl)
      .limit(1) // Optimization: only need to know if it exists
      .get();

    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      console.log('Background: URL found (primary).');
      return { success: true, exists: true, data: doc.data(), firestoreId: doc.id };
    }

    // Check alternative URL format (if applicable, e.g., with/without #)
    // Note: The original checkUrlInFirestore had logic for this, replicating part of it.
    // Consider if this alternative check is still necessary.
    const altUrl = normalizedUrl.includes('#') ? normalizedUrl.replace(/#$/, '') : normalizedUrl + '#';
    if (altUrl !== normalizedUrl) { // Only check if different
        querySnapshot = await db.collection(collectionPath)
            .where('link_pag', '==', altUrl)
            .limit(1)
            .get();

        if (!querySnapshot.empty) {
            const doc = querySnapshot.docs[0];
            console.log('Background: URL found (alternative).');
            return { success: true, exists: true, data: doc.data(), firestoreId: doc.id };
        }
    }


    console.log('Background: URL not found.');
    return { success: true, exists: false, data: null, firestoreId: null };

  } catch (error) {
    console.error('Background: Error checking URL in Firestore:', error);
    return { success: false, exists: false, data: null, firestoreId: null, error: error.message };
  }
}

async function handleSaveProperty(userId, data) {
  console.log(`Background: Saving property for user ${userId}`, data);
  const collectionPath = getFirestoreCollectionPath(userId);
  // Ensure URL is normalized (should be already, but double-check)
  const normalizedUrl = normalizeFirestoreUrl(data.link_pag);
  const dataToSave = { ...data, link_pag: normalizedUrl };

  try {
    // Check if document already exists based on normalized URL
    const querySnapshot = await db.collection(collectionPath)
      .where('link_pag', '==', normalizedUrl)
      .limit(1)
      .get();

    let firestoreId;
    if (!querySnapshot.empty) {
      // Update existing document
      firestoreId = querySnapshot.docs[0].id;
      // Add/update timestamp
      dataToSave.updatedAt = self.firebase.firestore.FieldValue.serverTimestamp();
      await db.collection(collectionPath).doc(firestoreId).update(dataToSave);
      console.log('Background: Document updated successfully. Firestore ID:', firestoreId);
    } else {
      // Create new document
      // Add timestamps
      const nowTimestamp = self.firebase.firestore.Timestamp.now(); // Use server timestamp if possible or consistent client time
      dataToSave.data_added = nowTimestamp; // Changed from createdAt
      dataToSave.updatedAt = nowTimestamp;
      // The original code used a specific date format, using Timestamp now.
      // dataToSave.data_added = self.firebase.firestore.Timestamp.fromDate(now); // Original logic

      const docRef = await db.collection(collectionPath).add(dataToSave);
      firestoreId = docRef.id;
      console.log('Background: New document created successfully. Firestore ID:', firestoreId);
    }
    return { success: true, firestoreId: firestoreId };
  } catch (error) {
    console.error('Background: Error saving property data to Firestore:', error);
    return { success: false, error: error.message };
  }
}


// --- Message Listener for Firebase and other actions ---
// Make the listener async to allow awaiting the initialization promise
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request);

  // Use an immediately-invoked async function to handle the logic
  // This allows using await inside and returning true for async sendResponse
  (async () => {
    try {
      // Wait for Firebase to be ready before handling Firebase-related messages
      if (['SIGN_IN', 'CHECK_URL', 'SAVE_PROPERTY'].includes(request.type)) {
          console.log(`Waiting for Firebase init before handling ${request.type}...`);
          await firebaseReadyPromise; // Wait for the promise to resolve
          console.log(`Firebase ready, proceeding with ${request.type}.`);
      }

      // Handle messages after potential wait
      if (request.type === 'SIGN_IN') {
        const response = await handleSignIn(request.email, request.password);
        console.log('Background sending sign-in response:', response);
        sendResponse(response);
      } else if (request.type === 'CHECK_URL') {
        const response = await handleCheckUrl(request.userId, request.normalizedUrl);
        console.log('Background sending check-url response:', response);
        sendResponse(response);
      } else if (request.type === 'SAVE_PROPERTY') {
        const response = await handleSaveProperty(request.userId, request.data);
        console.log('Background sending save-property response:', response);
        sendResponse(response);
      } else if (request.type === 'GET_CURRENT_USER') {
        // Ensure Firebase is ready before accessing auth
        await firebaseReadyPromise; 
        console.log("Background: Responding to GET_CURRENT_USER with:", auth.currentUser);
        // Send only essential, serializable user data
        const user = auth.currentUser;
        const userData = user ? { uid: user.uid, email: user.email } : null;
        console.log("Background: Responding to GET_CURRENT_USER with simplified data:", userData);
        sendResponse({ success: true, user: userData });
      } else if (request.type === 'SIGN_OUT') {
        // Ensure Firebase is ready
        await firebaseReadyPromise;
        try {
          await auth.signOut();
          console.log("Background: Sign out successful.");
          sendResponse({ success: true });
        } catch(error) {
          console.error("Background: Sign out error:", error);
          sendResponse({ success: false, error: error.message });
        }
      } else if (request.type === 'ANALYZE_PROPERTY') {
        // This doesn't depend on Firebase, can run immediately
        const result = await analyzeProperty(request.url);
        sendResponse({ type: 'ANALYSIS_RESULT', result: result });
      } else {
        // Optional: Handle unknown message types
        console.log('Background: Unhandled message type:', request.type);
        // sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (error) {
      // Catch errors from awaiting the promise or from the handlers
      console.error(`Background error handling message type ${request.type}:`, error);
      // Send a generic error response
      sendResponse({ success: false, error: `Internal background error processing ${request.type}. Details: ${error.message}` });
    }
  })(); // Immediately invoke the async function

  return true; // Indicate that sendResponse will be called asynchronously
});


// --- Port connection management (Keep for potential long-running tasks or stream updates) ---
// Note: The primary communication for simple requests like login should now use chrome.runtime.sendMessage
let currentPort = null;

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'popup') { // Or whatever name you use
      currentPort = port;
      console.log('Background connected to port:', port.name);

      port.onMessage.addListener((msg) => {
          console.log('Background received port message:', msg);
          // Handle messages received via the port if needed
          // Example: if (msg.type === 'START_LONG_TASK') { ... }
      });

      port.onDisconnect.addListener(() => {
          console.log('Port disconnected:', port.name);
          if (currentPort === port) {
              currentPort = null;
          }
      });
  }
});

// Function to send message via port if connected
function postMessageToPort(message) {
    if (currentPort) {
        try {
            currentPort.postMessage(message);
        } catch (error) {
            console.error("Failed to post message to port:", error);
            currentPort = null; // Assume port is dead
        }
    } else {
        console.log("No active port connection to send message:", message);
    }
}

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).then(() => {
  console.log('Side panel behavior set');
}).catch((error) => {
  console.error('Failed to set side panel behavior:', error);
});

// Service Worker setup
self.addEventListener('install', (event) => {
  console.log('Service Worker installed');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activated');
  event.waitUntil(clients.claim());
});

// Keep the service worker alive using chrome.alarms
chrome.alarms.create('keepAlive', { periodInMinutes: 0.5 }); // Execute every 30 seconds

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'keepAlive') {
    console.log('Service Worker still alive');
    if (currentPort) {
      currentPort.postMessage({ type: 'ping' });
    }
  }
});

// Listen for tab activation changes - Use postMessageToPort
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  console.log('Tab activated:', activeInfo.tabId);
  try {
    // Wait a short moment for the tab properties to be updated
    await new Promise(resolve => setTimeout(resolve, 100));
    const tab = await chrome.tabs.get(activeInfo.tabId);
    const currentUrl = tab.url;

    // Skip if URL is not valid or is a PDF
    const isPdf = currentUrl && currentUrl.toLowerCase().includes('.pdf');
    if (!currentUrl || !currentUrl.startsWith('http') || isPdf) {
      console.log('Tab URL not valid for processing or is a PDF');
      return;
    }

    // Notify the popup/side panel about the tab change via the port
    console.log('Sending TAB_ACTIVATED message via port with URL:', currentUrl);
    postMessageToPort({ type: 'TAB_ACTIVATED', url: currentUrl });

  } catch (error) {
    // Ignore errors if the tab is closed quickly after activation
    if (!error.message.includes('No tab with id')) {
      console.error('Error getting tab info or sending message:', error);
    }
  }
});

// --- Listen for Tab URL Updates (Navigation within the same tab) ---
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Log all updates to see what's happening
  console.log(`BACKGROUND: onUpdated fired for Tab ${tabId}. Status: ${tab.status}. ChangeInfo:`, changeInfo);

  // Check if the tab update is complete and the tab has a valid URL
  if (changeInfo.status === 'complete' && tab.url && tab.url.startsWith('http')) {
    const newUrl = tab.url; // Use tab.url as it reflects the final URL
    console.log(`BACKGROUND: Tab ${tabId} completed update. Final URL: ${newUrl}`);

    // Skip if URL is a PDF
    const isPdf = newUrl.toLowerCase().includes('.pdf');
    if (!newUrl.startsWith('http') || isPdf) {
      console.log('Updated URL not valid for processing or is a PDF');
      // Optionally send a message to hide the button if needed
      postMessageToPort({ type: 'URL_UPDATED', url: newUrl, isDomainValid: false });
      return;
    }

    // Check if the domain is valid
    const domain = getDomainFromUrl(newUrl);
    const isDomainValid = await isUrlInLeiloeirosCsv(newUrl); // Use the existing function

    console.log(`BACKGROUND: Sending URL_UPDATED message via port. URL: ${newUrl}, Domain Valid: ${isDomainValid}`);
    console.log(`BACKGROUND: Current port status before sending:`, currentPort ? 'Connected' : 'Disconnected'); // Log port status
    // Send message to the connected popup/sidebar
    postMessageToPort({
      type: 'URL_UPDATED',
      url: newUrl,
      isDomainValid: isDomainValid
    });
  }
});


// Log when the service worker starts
console.log('Background service worker initialized');
