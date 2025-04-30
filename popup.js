// Main application script
import AuthService from './auth.js';
import ApiService from './api.js';
import CacheService from './cache.js';
import DomainCheckerService from './domainChecker.js';
import FirestoreService from './firestoreService.js';
import UiService from './ui.js';
// Removed direct import of auth, db from firebase-init as they are handled by background

// Main app class
class ArremataApp {
  constructor() {
    this.backgroundPort = null;
    this.initialized = false;
    
    // Initialize services - AuthService no longer needs auth passed in
    this.authService = new AuthService(); 
    this.apiService = new ApiService();
    this.cacheService = new CacheService();
    this.domainChecker = new DomainCheckerService();
    // FirestoreService needs refactoring to communicate with background script
    // For now, comment out or adjust its usage if possible
    // this.firestoreService = new FirestoreService(db); // TODO: Refactor FirestoreService
    this.firestoreService = null; // Placeholder - Firestore operations need to go via background
    this.uiService = new UiService();
    
    // Initialize the app
    this.init();
  }
  
  // Initialize application
  async init() {
    try {
      console.log('Initializing ArremataApp...');
      
      this.uiService.setupInitialUI();
      this.connectToBackground(); // Establishes connection
      this.initEventListeners();
      
      // Check authentication state and perform initial setup (including subscription check)
      await this.initializeMainFlow(true); // Pass true to perform subscription check on init

      this.initialized = true; 
    } catch (error) {
      console.error('Error initializing app:', error);
      this.uiService.hideLoading();
      this.uiService.showMessage('Erro ao inicializar o aplicativo: ' + error.message, true); // Translated
    }
  }
  
  // Initialize event listeners
  initEventListeners() {
    console.log('Initializing event listeners...');
    
    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', this.handleLogin.bind(this));
    }
    
    // Extract data button
    const extractDataButton = document.getElementById('extractDataButton');
    if (extractDataButton) {
      extractDataButton.addEventListener('click', this.handleAnalyzeProperty.bind(this));
    }
    
    // Header buttons
    const analyzePropertyBtn = document.getElementById('analyzePropertyBtn');
    if (analyzePropertyBtn) {
      analyzePropertyBtn.addEventListener('click', this.handleAnalyzeProperty.bind(this));
    }
    
    // Corrected Logout Button Listener (using ID from ui.js)
    const logoutButton = document.getElementById('logoutButton'); 
    if (logoutButton) {
      logoutButton.addEventListener('click', this.handleLogout.bind(this));
    }
    
    // Confirmation button event is added dynamically when the form is displayed
    
    // Error buttons
    const closeErrorBtn = document.getElementById('closeErrorBtn');
    if (closeErrorBtn) {
      closeErrorBtn.addEventListener('click', () => {
        this.uiService.showLoginSection(this.authService.isAuthenticated());
      });
    }
    
    const logoutErrorBtn = document.getElementById('logoutErrorBtn');
    if (logoutErrorBtn) {
      logoutErrorBtn.addEventListener('click', this.handleLogout.bind(this));
    }

    // New Header Extract Button Listener
    const headerExtractButton = document.getElementById('headerExtractButton');
    if (headerExtractButton) {
      headerExtractButton.addEventListener('click', this.handleAnalyzeProperty.bind(this));
    }
  }
  
  // Connect to background script
  connectToBackground() {
    try {
      // Avoid creating multiple connections
      if (this.backgroundPort && this.backgroundPort.sender) {
        console.log('Already connected to background script.');
        return this.backgroundPort;
      }

      this.backgroundPort = chrome.runtime.connect({ name: 'popup' });
      console.log('Connected to background script');

      this.backgroundPort.onMessage.addListener(this.handleBackgroundMessage.bind(this));
      
      this.backgroundPort.onDisconnect.addListener(() => {
        console.log('Disconnected from background script.');
        this.backgroundPort = null;
      });
      
      return this.backgroundPort;
    } catch (error) {
      console.error('Failed to connect to background script:', error);
      this.backgroundPort = null;
      return null;
    }
  }
  
  // Handle messages from background script
  handleBackgroundMessage(msg) {
    console.log('Message received from background:', msg);
    if (msg.type === 'TAB_ACTIVATED') {
      console.log('Received TAB_ACTIVATED for URL:', msg.url);
      // Re-initialize the app logic for the new URL, but DO NOT re-check subscription
      this.initializeMainFlow(false); // Pass false to skip subscription check on tab switch
    } else if (msg.type === 'ANALYSIS_RESULT') {
      // Handle analysis results
      const result = msg.result;
      if (result.success) {
        console.log('Analysis completed successfully (received from background)');
        this.handleAnalysisResult(result);
      } else {
        console.error('Error in analysis (received from background):', result.error);
        this.uiService.hideLoading();
        this.uiService.showMessage('Error analyzing property: ' + result.error, true);
      }
    } else if (msg.type === 'ERROR') {
      console.error('Error message from background:', msg.error);
      this.uiService.hideLoading();
      this.uiService.showMessage('Background error: ' + msg.error, true);
    } else if (msg.type === 'URL_UPDATED') {
      console.log(`POPUP: Received URL_UPDATED for URL: ${msg.url}, Valid: ${msg.isDomainValid}`); // Log reception
      
      const propertyFormSection = document.getElementById('propertyFormSection');
      const isFormVisible = propertyFormSection && propertyFormSection.style.display !== 'none';
      console.log(`POPUP: Is property form visible? ${isFormVisible}`);

      let showButton = false;
      let useRefetchText = false;

      if (isFormVisible && msg.isDomainValid) {
        // Form is visible and the new URL's domain is valid
        showButton = true; 
        
        // Now determine the text based on URL comparison
        const formLinkPagInput = document.getElementById('link_pag');
        const formUrl = formLinkPagInput ? formLinkPagInput.value : null;
        const normalizedFormUrl = formUrl ? this.domainChecker.normalizeUrl(formUrl) : null;
        const normalizedNewUrl = this.domainChecker.normalizeUrl(msg.url);
        
        console.log(`POPUP: Normalized New URL: ${normalizedNewUrl}`);
        console.log(`POPUP: Normalized Form URL: ${normalizedFormUrl}`);

        if (normalizedNewUrl && normalizedFormUrl && normalizedNewUrl === normalizedFormUrl) {
          // URLs are the same, use "Refazer..." text
          useRefetchText = true;
        } else {
          // URLs are different (or form URL missing), use "Extrair..." text
          useRefetchText = false; 
        }
      } else {
        // Form not visible or domain invalid, hide the button
        showButton = false;
      }

      console.log(`POPUP: Show button: ${showButton}, Use refetch text: ${useRefetchText}`); // Log decision
      // Call the updated UI function
      this.uiService.updateHeaderExtractButton(showButton, useRefetchText); 
    }
  }
  
  // Handle login form submission
  async handleLogin(event) {
    event.preventDefault();
    console.log('Login form submitted');
    
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    
    if (!emailInput || !passwordInput) {
      console.error('Login form inputs not found');
      this.uiService.showMessage('Erro ao encontrar campos do formulário', true); // Translated
      return;
    }
    
    this.uiService.showLoading('Entrando...'); // Translated
    const result = await this.authService.signIn(emailInput.value, passwordInput.value);
    
    if (result.success) {
      console.log('Login successful');
      // Add the 'login-success-message' class specifically for this message
      this.uiService.showMessage('Login realizado com sucesso!', false, 'login-success-message'); // Translated
      await this.initializeMainFlow();
    } else {
      console.error('Login failed:', result.error);
      this.uiService.hideLoading();
      this.uiService.showMessage(result.error, true);
    }
  }
  
  // Handle logout button click
  async handleLogout() {
    this.uiService.showLoading('Saindo...'); // Translated
    const result = await this.authService.signOut();
    this.uiService.hideLoading();
    
    if (result.success) {
      // Add the 'logout-success-message' class specifically for this message
      this.uiService.showMessage('Logout realizado com sucesso!', false, 'logout-success-message'); // Translated
      this.uiService.showLoginSection();
    } else {
      this.uiService.showMessage('Erro ao sair: ' + result.error, true); // Translated
    }
  }
  
  // Handle analyze property button click
  async handleAnalyzeProperty() {
    try {
      console.log('Starting property analysis...');
      this.uiService.showLoading('Analisando imóvel...'); // Translated
      
      const user = this.authService.getCurrentUser();
      if (!user) {
        throw new Error('Usuário não autenticado'); // Translated
      }
      
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tabs || tabs.length === 0) {
        throw new Error('Não foi possível encontrar a aba ativa'); // Translated
      }
      
      const currentUrl = tabs[0].url;
      console.log('URL for analysis:', currentUrl);
      
      // Perform domain verification
      this.uiService.showLoading('Analisando e extraindo dados com nossa IA...'); // Translated
      const currentDomain = this.domainChecker.getDomainFromUrl(currentUrl);
      const isDomainValid = await this.domainChecker.isDomainInLeiloeirosList(currentDomain);
      
      if (!isDomainValid) {
        this.uiService.hideLoading();
        // Message is now handled by displayDomainStatus which is already translated
        // this.uiService.showMessage('This domain is not in the list of auctioneers recognized by arremata.ai', true);
        this.uiService.displayDomainStatus(false); // Ensure status is shown
        console.log('Domain not supported for analysis:', currentDomain);
        return;
      }
      
      // Proceed with analysis
      console.log('Valid domain, proceeding with analysis');
      const result = await this.apiService.analyzeProperty(currentUrl);
      
      if (result.success) {
        console.log('Analysis completed successfully');
        const normalizedUrl = this.domainChecker.normalizeUrl(currentUrl); 

        // Check Firestore via background script
        console.log(`Checking Firestore via background for user ${user.uid} and URL ${normalizedUrl}...`);
        let firestoreCheck = { exists: false, firestoreId: null }; // Default value
        try {
            const firestoreResponse = await chrome.runtime.sendMessage({
                type: 'CHECK_URL',
                userId: user.uid,
                normalizedUrl: normalizedUrl 
            });
            console.log("Firestore check response from background:", firestoreResponse);
            if (firestoreResponse && firestoreResponse.success) {
                firestoreCheck = { 
                    exists: firestoreResponse.exists, 
                    firestoreId: firestoreResponse.firestoreId 
                };
            } else {
                 console.warn("Failed to get Firestore check response from background:", firestoreResponse?.error);
                 // Proceed with default values, maybe show a non-critical warning?
            }
        } catch (error) {
            console.error("Error sending CHECK_URL message to background:", error);
            // Proceed with default values, maybe show a non-critical warning?
        }

        // Save to cache with potentially updated firestoreId
        const dataToCache = { 
          ...result.data, 
          firestoreId: firestoreCheck.firestoreId 
        };
        await this.cacheService.saveToCache(normalizedUrl, dataToCache);
        console.log('Data saved to cache after analysis and Firestore check.');
        
        this.uiService.hideLoading();
        // Ensure link_pag from the analyzed URL is included when displaying
        const displayData = { ...dataToCache, link_pag: currentUrl }; 
        this.uiService.displayPropertyData(displayData); 
        // Show header button with "Refazer" text as URL matches form data
        this.uiService.updateHeaderExtractButton(true, true); 
        this.addFormEventListeners(); 
        
        // Update message based on Firestore check result
        if (firestoreCheck.exists) {
          this.uiService.showMessage('Análise completa. Este imóvel já está no seu portfólio.'); // Translated
        } else {
          this.uiService.showMessage('Análise completa. Você pode salvar este imóvel no seu portfólio.'); // Translated
        }
      } else {
        // Use result.error for analysis errors
        throw new Error(result.error || 'Erro ao analisar imóvel'); // Translated
      }
    } catch (error) {
      console.error('Error in property analysis:', error);
      this.uiService.hideLoading();
      this.uiService.showMessage(error.message, true);
    }
  }
  
  // Handle analysis result
  async handleAnalysisResult(result) {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs && tabs.length > 0) {
        const currentUrl = this.domainChecker.normalizeUrl(tabs[0].url);
        await this.cacheService.saveToCache(currentUrl, result.data);
        this.uiService.displayPropertyData(result.data);
        this.addFormEventListeners();
        this.uiService.hideLoading();
      } else {
        console.error("Could not get active tab URL to save cache.");
        this.uiService.hideLoading();
        this.uiService.showMessage('Erro ao obter URL da aba ativa.', true); // Translated
      }
    } catch (error) {
      console.error("Error handling analysis result:", error);
      this.uiService.hideLoading();
      this.uiService.showMessage('Erro ao processar resultado da análise.', true); // Translated
    }
  }
  
  // Add event listeners to form
  addFormEventListeners() {
    // Add confirm button listener
    const confirmPropertyBtn = document.getElementById('confirmPropertyBtn');
    if (confirmPropertyBtn) {
      confirmPropertyBtn.addEventListener('click', this.handlePropertyConfirmation.bind(this));
    }
    
    // Add auto-save listeners
    this.uiService.addAutoSaveListeners(this.handleFormAutoSave.bind(this));
  }
  
  // Handle form auto-save
  async handleFormAutoSave() {
    // Add await here
    const user = await this.authService.getCurrentUser();
    if (!user) {
        console.log("Auto-save skipped: User not available.");
        return;
    }
    
    const formData = this.uiService.collectFormData();
    if (!formData || !formData.link_pag) return;
    
    const normalizedUrl = this.domainChecker.normalizeUrl(formData.link_pag);
    await this.cacheService.saveToCache(normalizedUrl, formData);
    console.log('Form data auto-saved to cache for URL:', normalizedUrl);
  }
  
  // Handle property confirmation
  async handlePropertyConfirmation() {
    try {
      console.log('Starting property confirmation...');
      this.uiService.showLoading('Salvando dados...'); // Translated

      // Await the user object and check specifically for uid
      const user = await this.authService.getCurrentUser();
      console.log("User object received in handlePropertyConfirmation:", user); // Log the user object

      if (!user || !user.uid) { // Check for user object AND user.uid
        console.error('Authentication error: User object is missing or lacks UID.', user);
        throw new Error('Usuário não autenticado ou ID do usuário ausente.'); // More specific error
      }

      // Collect form data
      const formData = this.uiService.collectFormData();
      if (!formData || !formData.link_pag) {
        // If link_pag is not in the form, get it from the current tab
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs && tabs.length > 0) {
          formData.link_pag = this.domainChecker.normalizeUrl(tabs[0].url);
        } else {
          throw new Error('Não foi possível obter o link da página para salvar.'); // Translated
        }
      }
      
      // Normalize link_pag
      formData.link_pag = this.domainChecker.normalizeUrl(formData.link_pag);

      // Send SAVE_PROPERTY message to background script
      console.log(`Sending SAVE_PROPERTY message to background for user ${user.uid}...`); // Log the UID being sent
      const saveResponse = await chrome.runtime.sendMessage({
          type: 'SAVE_PROPERTY',
          userId: user.uid, // Send user.uid
          data: formData
      });
      console.log("Received SAVE_PROPERTY response from background:", saveResponse);

      if (saveResponse && saveResponse.success) {
        // Update cache with the firestoreId received from background
        await this.cacheService.saveToCache(formData.link_pag, { ...formData, firestoreId: saveResponse.firestoreId });
        console.log('Cache updated after successful Firestore save.');
        
        this.uiService.hideLoading();
        this.uiService.showMessage('Dados salvos com sucesso!'); // Translated
        
        // Update button state using the new firestoreId
        this.uiService.updateConfirmationButton(saveResponse.firestoreId); 
        
        // Reattach event listener to the button (might be needed if button is replaced/re-rendered)
        const confirmBtn = document.getElementById('confirmPropertyBtn');
        if (confirmBtn) {
          confirmBtn.addEventListener('click', this.handlePropertyConfirmation.bind(this));
        }
      } else {
        // Use saveResponse.error for save errors
        throw new Error(saveResponse?.error || 'Erro ao salvar dados'); // Translated
      }
    } catch (error) {
      console.error('Error in confirmation:', error);
      this.uiService.hideLoading();
      this.uiService.showMessage('Erro ao salvar: ' + error.message, true); // Translated
    }
  }
  
  // Main application flow
  async initializeMainFlow(performSubscriptionCheck = false) { // Add parameter with default false
    console.log(`Starting main application flow... (Subscription check: ${performSubscriptionCheck})`);
    
    // Ensure we wait for the user state to be potentially fetched from background
    const user = await this.authService.getCurrentUser(); 
    
    // Hide login section if user is authenticated
    if (user) {
      this.uiService.showLoginSection(true);
    } else {
      console.log('User not logged in, showing login screen');
      this.uiService.hideLoading();
      this.uiService.showLoginSection();
      return;
    }
    
    try {
      this.uiService.showLoading('Verificando dados...'); // Translated
      
      // --- Conditional Subscription Check ---
      if (performSubscriptionCheck) {
        this.uiService.showLoading('Verificando assinatura...'); // Translated
        const subscriptionStatus = await this.apiService.checkSubscription(user.email);
        if (!subscriptionStatus.active) {
          console.log('Inactive subscription');
          this.uiService.hideLoading();
          this.uiService.showMessage('Sua assinatura não está ativa. Por favor, renove sua assinatura.', true); // Translated
          return; // Stop flow if subscription is inactive
        }
        console.log('Subscription active');
      }
      // --- End Conditional Subscription Check ---
      
      // Get current URL
      this.uiService.showLoading('Buscando informações...'); // Translated
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tabs || tabs.length === 0) {
        throw new Error('Não foi possível encontrar a aba ativa'); // Translated (already done above)
      }
      
      const currentUrl = this.domainChecker.normalizeUrl(tabs[0].url);
      const currentDomain = this.domainChecker.getDomainFromUrl(currentUrl);
      console.log('Normalized URL:', currentUrl);
      console.log('Extracted domain:', currentDomain);
      
      // Check if URL is valid for processing
      if (!currentUrl || !currentUrl.startsWith('http')) {
        this.uiService.hideLoading();
        this.uiService.showMessage('A URL da aba atual não é válida para análise (ex: chrome://, file://).', true); // Translated
        console.log('Unsupported URL:', currentUrl);
        return;
      }
      
      // Check if domain is in leiloeiros list
      this.uiService.showLoading('Verificando domínio na lista de leiloeiros...'); // Translated
      const isDomainValid = await this.domainChecker.isDomainInLeiloeirosList(currentDomain);
      // We will display the status message LATER, only if data is not found.

      if (!isDomainValid) {
        // Still display the message if the domain is outright invalid
        this.uiService.displayDomainStatus(false);
        this.uiService.hideLoading();
        // No longer need showMessage here, displayDomainStatus handles it
        console.log('Unsupported domain:', currentDomain);
        return;
      }
      
      // Check cache and Firestore
      this.uiService.showLoading('Consultando banco de dados...'); // Translated
      let dataToDisplay = null;
      let idToDisplay = null;
      let source = null;
      
      // Check cache first
      const cachedData = await this.cacheService.getCache(currentUrl);
      if (cachedData) {
        console.log('Data found in cache');
        dataToDisplay = cachedData;
        idToDisplay = cachedData.firestoreId; // May be null if only cached
        source = 'Cache';
      }
      
      // Only check Firestore if nothing was found in the cache
      if (!dataToDisplay) {
          console.log('No data in cache, checking Firestore via background script...');
          try {
              const firestoreResponse = await chrome.runtime.sendMessage({
                  type: 'CHECK_URL',
                  userId: user.uid, // Make sure user object has uid
                  normalizedUrl: currentUrl 
              });
              console.log("Firestore check response from background:", firestoreResponse);

              if (firestoreResponse && firestoreResponse.success && firestoreResponse.exists) {
                  console.log('Analysis found in Firestore via background.');
                  dataToDisplay = firestoreResponse.data;
                  idToDisplay = firestoreResponse.firestoreId;
                  source = 'Firestore';
                  
                  // Update cache with Firestore data
                  await this.cacheService.saveToCache(currentUrl, { ...dataToDisplay, firestoreId: idToDisplay });
                  console.log('Cache updated with Firestore data and firestoreId.');
              } else if (firestoreResponse && !firestoreResponse.success) {
                  // Handle error from background check
                  console.error("Error checking Firestore via background:", firestoreResponse.error);
                  // Optionally show a non-blocking error message
              } else {
                  console.log('URL not found in Firestore via background.');
              }
          } catch (error) {
              console.error("Error sending CHECK_URL message to background:", error);
              // Optionally show a non-blocking error message
          }
      }
      
      // Display data if found from Cache or Firestore
      if (dataToDisplay) {
        this.uiService.hideLoading();
        // Hide domain status message if we are showing property data
        this.uiService.displayDomainStatus(null);
        // Determine if the property exists in Firestore (has an ID), regardless of source
        const existsInFirestore = !!idToDisplay; 
        this.uiService.displayPropertyData({ 
            ...dataToDisplay, 
            firestoreId: idToDisplay, 
            link_pag: currentUrl,
            existsInFirestore: existsInFirestore // Pass the correct flag
        });
        // Show header button with "Refazer" text as URL matches form data
        this.uiService.updateHeaderExtractButton(true, true); 
        this.addFormEventListeners();
        
        // Removed unnecessary success messages for cache/firestore hits
        // if (source === 'Firestore') {
        //   this.uiService.showMessage('Property data found in your analysis portfolio.');
        // } else if (source === 'Cache' && idToDisplay) {
        //   this.uiService.showMessage('Property data found in cache (previously saved).');
        // } else if (source === 'Cache') {
        //   this.uiService.showMessage('Property data found in cache (not saved yet).');
        // }
        
        return;
      }
      
      // If no data found, NOW display the domain status and update the main extract button (if valid)
      this.uiService.hideLoading();
      this.uiService.displayDomainStatus(isDomainValid); // Display status here
      // Use the correct function for the main button (show if valid)
      this.uiService.showExtractDataButton(isDomainValid); 
      // Ensure header button is hidden if no data is displayed initially
      this.uiService.updateHeaderExtractButton(false, false); 
    } catch (error) {
      // Ensure domain status is hidden on error too
      this.uiService.displayDomainStatus(null);
      console.error('Error in initialization:', error);
      this.uiService.hideLoading();
      this.uiService.showMessage('Erro na inicialização: ' + error.message, true); // Translated
    }
  }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, starting extension...');
  
  // Initialize the application
  // The extractDataButton is now part of the initial HTML from UiService
  window.arremataApp = new ArremataApp();
});
