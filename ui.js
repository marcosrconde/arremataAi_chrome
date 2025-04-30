// UI Service
class UiService {
  constructor() {
    this.loadingOverlayId = 'loadingOverlay';
    this.messageContainerId = 'messageContainer';
  }

  // Initialize UI elements
  setupInitialUI() {
    console.log('Setting up initial UI...');
    
    // Inject initial HTML structure
    const container = document.getElementById('container');
    if (!container) return;
    
    container.innerHTML = this.getInitialHtml();
    
    // Add required styles
    this.addStyles();
  }

  // Show loading overlay
  showLoading(message = 'Processando...') { // Already in Portuguese
    const existingOverlay = document.getElementById(this.loadingOverlayId);
    if (existingOverlay) {
      const loadingText = existingOverlay.querySelector('.loading-text');
      if (loadingText) {
        loadingText.textContent = message;
      }
      return;
    }

    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    overlay.id = this.loadingOverlayId;
    overlay.innerHTML = `
      <div class="loading-spinner"></div>
      <div class="loading-text">${message}</div>
    `;

    document.body.appendChild(overlay);
  }

  // Hide loading overlay
  hideLoading() {
    const overlay = document.getElementById(this.loadingOverlayId);
    if (overlay) {
      overlay.remove();
    }
  }

  // Show message
  showMessage(message, isError = false, additionalClass = '') { // Add additionalClass parameter
    const messageContainer = document.getElementById(this.messageContainerId);
    if (!messageContainer) {
      console.error('Message container not found');
      return;
    }

    messageContainer.textContent = message;
    // Combine base classes with the additional class if provided
    messageContainer.className = `message ${isError ? 'error' : 'success'} ${additionalClass}`.trim(); 
    messageContainer.style.display = 'block';

    // Hide message after 5 seconds
    setTimeout(() => {
      if (messageContainer) {
        messageContainer.style.display = 'none';
      }
    }, 5000);
  }

  // Show login section OR authenticated section based on state
  showLoginSection(isAuthenticated = false) {
    const loginSection = document.getElementById('loginSection');
    const authenticatedSection = document.getElementById('authenticatedSection');
    const propertyFormSection = document.getElementById('propertyFormSection');
    const confirmationSection = document.getElementById('confirmationSection');
    const extractButtonContainer = document.getElementById('extractButtonContainer'); // Target container

    // Hide all potentially conflicting sections first
    if (propertyFormSection) propertyFormSection.style.display = 'none';
    if (confirmationSection) confirmationSection.style.display = 'none';
    // Remove the unconditional hide for the button container here
    // if (extractButtonContainer) extractButtonContainer.style.display = 'none';

    if (isAuthenticated) {
      // User is authenticated: Hide login, show authenticated header/area
      if (loginSection) loginSection.style.display = 'none';
      if (authenticatedSection) authenticatedSection.style.display = 'block'; // Show the authenticated header/area
      // The main flow will decide whether to show the extract button or property form later
    } else {
      // User is not authenticated: Show login, hide authenticated header/area
      if (loginSection) {
         loginSection.style.display = 'block';
         loginSection.className = ''; // Remove authenticated class if present
      }
      if (authenticatedSection) authenticatedSection.style.display = 'none';
      // Also hide the domain status message and extract button when showing the login screen
      const domainStatusEl = document.getElementById('domainStatusMessage');
      if (domainStatusEl) domainStatusEl.style.display = 'none';
      const extractButtonContainer = document.getElementById('extractButtonContainer');
      if (extractButtonContainer) extractButtonContainer.style.display = 'none';
    }
  }

  // Show property form section
  showPropertyForm() {
    const loginSection = document.getElementById('loginSection');
    const authenticatedSection = document.getElementById('authenticatedSection');
    const propertyFormSection = document.getElementById('propertyFormSection');
    const confirmationSection = document.getElementById('confirmationSection');
    
    if (loginSection) loginSection.style.display = 'none'; // Hide login section
    // Keep authenticatedSection (header) visible
    if (propertyFormSection) propertyFormSection.style.display = 'block'; // Show property form
    if (confirmationSection) confirmationSection.style.display = 'block'; // Show confirmation buttons
  }

  // Show error section
  showErrorSection(message) {
    const loginSection = document.getElementById('loginSection');
    const authenticatedSection = document.getElementById('authenticatedSection');
    const propertyFormSection = document.getElementById('propertyFormSection');
    const confirmationSection = document.getElementById('confirmationSection');
    const errorSection = document.getElementById('errorSection');
    
    if (loginSection) loginSection.style.display = 'none';
    if (authenticatedSection) authenticatedSection.style.display = 'none';
    if (propertyFormSection) propertyFormSection.style.display = 'none';
    if (confirmationSection) confirmationSection.style.display = 'none';
    
    if (errorSection) {
      errorSection.style.display = 'block';
      const errorMessage = document.getElementById('errorMessage');
      if (errorMessage) {
        errorMessage.textContent = message;
      }
    }
  }

  // Display persistent domain status message
  displayDomainStatus(isValidDomain) {
    const domainStatusEl = document.getElementById('domainStatusMessage');
    if (!domainStatusEl) {
      console.error("UI Error: domainStatusMessage element not found!");
      return;
    }

    if (isValidDomain === true) {
      domainStatusEl.textContent = 'Este domínio de leiloeiro é reconhecido pelo Arremata.ai';
      domainStatusEl.className = 'message success'; // Use success style
      domainStatusEl.style.display = 'block';
    } else if (isValidDomain === false) {
      domainStatusEl.textContent = 'Este domínio não está na lista de leiloeiros reconhecidos pelo arremata.ai';
      domainStatusEl.className = 'message error'; // Use error style
      domainStatusEl.style.display = 'block';
    } else {
      // If isValidDomain is null or undefined, hide the message
      domainStatusEl.style.display = 'none';
    }
  }

  // Show "Extract Data" button with domain message
  showExtractDataButton(isValidDomain) {
    console.log(`showExtractDataButton called with isValidDomain: ${isValidDomain}`); // Log entry
    // Target the container now
    const extractButtonContainer = document.getElementById('extractButtonContainer');

    if (!extractButtonContainer) {
      console.error("UI Error: extractButtonContainer element not found in the DOM!");
      return; // Exit if container not found
    }

    // Now, just control the container visibility based on isValidDomain
    // The status message is displayed by the caller (popup.js)
    if (isValidDomain) {
      console.log("Domain is valid. Showing button container.");
      // Show the container (which includes the centered button)
      extractButtonContainer.style.display = 'block';
      console.log("extractButtonContainer display set to 'block'.");
    } else {
      console.log("Domain is not valid or function called with false. Hiding button container.");
      // Hide the container
      extractButtonContainer.style.display = 'none';
    }
  }

  // Display property data in form
  displayPropertyData(data) {
    console.log('Displaying property data:', data);
    // Hide domain status message when showing property data
    this.displayDomainStatus(null);
    // Also hide the extract button container
    const extractButtonContainer = document.getElementById('extractButtonContainer');
    if (extractButtonContainer) {
      extractButtonContainer.style.display = 'none';
    }

    // Extract data from response
    let propertyData;
    try {
      if (data.output) {
        propertyData = JSON.parse(data.output);
      } else if (typeof data === 'string') {
        propertyData = JSON.parse(data);
      } else {
        propertyData = data;
      }
    } catch (error) {
      console.error('Error parsing property data:', error);
      return;
    }
    
    // Show property form
    this.showPropertyForm();
    
    // Show/hide form header if the property exists in Firestore (regardless of cache)
    const formHeader = document.getElementById('formHeader');
    if (formHeader) {
      // Use the existsInFirestore flag passed from popup.js
      formHeader.style.display = propertyData.existsInFirestore ? 'block' : 'none'; 
    }
    
    // Set form values
    this.setFormValues(propertyData);
    
    // Show first photo if available
    this.displayFirstPhoto(propertyData.fotos_imovel);
    
    // Update confirmation button
    this.updateConfirmationButton(propertyData.firestoreId);
  }

  // Set form values
  setFormValues(data) {
    const form = document.getElementById('propertyForm');
    if (!form) return;
    
    // Helper function to set input value
    const setValue = (id, value) => {
      const element = form.querySelector(`#${id}`);
      if (element) {
        if (element.type === 'checkbox') {
          element.checked = value === true || value === 'true';
        } else {
          element.value = value !== undefined && value !== null ? value : '';
        }
      }
    };
    
    // Set values
    setValue('id_imovel', data.id_imovel);
    setValue('modalidade', data.modalidade);
    setValue('tipo', data.tipo);
    setValue('cidade', data.cidade);
    setValue('estado', data.estado);
    setValue('bairro', data.bairro);
    setValue('endereco', data.endereco);
    setValue('area_total', data.area_total);
    setValue('area_privativa', data.area_privativa);
    setValue('area_terreno', data.area_terreno);
    setValue('quartos', data.quartos);
    setValue('data_certame_1', data.data_certame_1);
    setValue('data_certame_2', data.data_certame_2);
    setValue('preco', data.preco);
    setValue('preco_2', data.preco_2);
    setValue('valor_avaliado', data.valor_avaliado);
    setValue('desconto', data.desconto);
    setValue('outros', data.outros);
    setValue('link_pag', data.link_pag);
    setValue('link_edital', data.link_edital);
    setValue('matricula', data.matricula);
    setValue('banco', data.banco);
    setValue('aceita_fhab', data.aceita_fhab);
    setValue('fotos_imovel', data.fotos_imovel);
    // Explicitly set the hidden link_pag input
    setValue('link_pag', data.link_pag); 
  }

  // Display first photo
  displayFirstPhoto(photosString) {
    if (!photosString) return;
    
    const photos = photosString.split(';').filter(url => url.trim());
    const firstPhotoContainer = document.getElementById('firstPhotoContainer');
    
    if (firstPhotoContainer && photos.length > 0) {
      const img = document.createElement('img');
      img.src = photos[0].trim();
      img.alt = 'Primeira foto do imóvel'; // Already in Portuguese
      img.style.maxWidth = '100%';
      img.style.height = 'auto';
      firstPhotoContainer.innerHTML = '';
      firstPhotoContainer.appendChild(img);
    }
  }

  // Update confirmation button
  updateConfirmationButton(firestoreId) {
    const confirmationSection = document.getElementById('confirmationSection');
    if (!confirmationSection) return;
    
    const buttonText = firestoreId
      ? 'Confirmar e atualizar imóvel' // Already in Portuguese
      : 'Salvar imóvel na Carteira'; // Already in Portuguese

    confirmationSection.innerHTML = `
      <div class="button-group">
        <button id="confirmPropertyBtn" class="primary-button">${buttonText}</button>
      </div>
    `;
  }

  // Get form data
  collectFormData() {
    const form = document.getElementById('propertyForm');
    if (!form) return null;
    
    // Helper function to get value
    const getValue = (id, defaultValue = '') => {
      const element = document.getElementById(id);
      return element ? element.value || defaultValue : defaultValue;
    };
    
    // Helper function to convert to number
    const toNumber = (value) => {
      if (!value || value === '') return null;
      const num = Number(value.replace(/[^0-9.-]+/g, ''));
      return isNaN(num) ? null : num;
    };
    
    // Collect data
    return {
      id_imovel: getValue('id_imovel'),
      modalidade: getValue('modalidade'),
      tipo: getValue('tipo'),
      cidade: getValue('cidade'),
      estado: getValue('estado'),
      bairro: getValue('bairro'),
      endereco: getValue('endereco'),
      quartos: toNumber(getValue('quartos')),
      area_total: toNumber(getValue('area_total')),
      area_privativa: toNumber(getValue('area_privativa')),
      area_terreno: toNumber(getValue('area_terreno')),
      data_certame_1: getValue('data_certame_1'),
      data_certame_2: getValue('data_certame_2'),
      preco: toNumber(getValue('preco')),
      preco_2: toNumber(getValue('preco_2')),
      valor_avaliado: toNumber(getValue('valor_avaliado')),
      desconto: toNumber(getValue('desconto')),
      outros: getValue('outros'),
      link_pag: getValue('link_pag'),
      link_edital: getValue('link_edital'),
      matricula: getValue('matricula'),
      banco: getValue('banco'),
      aceita_fhab: getValue('aceita_fhab'),
      fotos_imovel: getValue('fotos_imovel')
    };
  }

  // Add auto-save listeners
  addAutoSaveListeners(callback) {
    const propertyForm = document.getElementById('propertyForm');
    if (!propertyForm) return;
    
    propertyForm.addEventListener('input', this.debounce((event) => {
      if (event.target.matches('input, select, textarea')) {
        if (typeof callback === 'function') {
          callback();
        }
      }
    }, 500));
  }

  // Debounce function
  debounce(func, wait) {
    let timeout;
    return function(...args) {
      const context = this;
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(context, args), wait);
    };
  }

  // Update the header extract button's visibility and text
  updateHeaderExtractButton(show, useRefetchText = false) {
    const button = document.getElementById('headerExtractButton');
    if (!button) {
      console.error("UI Error: headerExtractButton element not found!");
      return;
    }

    if (show) {
      const buttonTextSpan = button.querySelector('span');
      if (buttonTextSpan) {
        const text = useRefetchText 
          ? 'Refazer a extração de dados deste imóvel' 
          : 'Extrair dados da aba atual';
        buttonTextSpan.textContent = text;
        console.log(`Header extract button text set to: "${text}"`);
      }
      button.style.display = 'inline-flex'; // Use inline-flex for button with icon
      console.log(`Header extract button visibility set to: ${button.style.display}`);
    } else {
      button.style.display = 'none';
      console.log("Header extract button hidden.");
    }
  }
  
  // Get initial HTML
  getInitialHtml() {
    return `
      <div id="messageContainer" class="message" style="display: none;"></div>

      <div id="loginSection">
        <div class="logo-container">
          <img src="images/Asset_12_ARREMATAAI.png" alt="Arremata.ai Logo" class="logo">
        </div>
        <form id="loginForm" class="auth-form">
          <div class="form-group" id="emailFormGroup">
            <input type="email" id="email" placeholder="E-mail" required> <!-- Translated placeholder -->
          </div>
          <div class="form-group" id="passwordFormGroup">
            <input type="password" id="password" placeholder="Senha" required>
          </div>
          <div class="form-group">
            <button type="submit" id="loginButton" class="primary-button">Entrar</button>
          </div>
        </form>
      </div>

      <div id="authenticatedSection" style="display: none;">
        <div class="header">
          <div class="header-logo-container"> <!-- Wrap logo -->
            <img src="images/Asset_12_ARREMATAAI.png" alt="Arremata.ai Logo" class="header-logo">
          </div>
          <div class="header-button-group"> <!-- Wrap buttons -->
            <button id="headerExtractButton" class="secondary-button" style="display: none;">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em">
                <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
              </svg>
              <span>Extrair dados da aba atual</span>
            </button> <!-- New button, hidden -->
            <button id="logoutButton" class="secondary-button">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em">
                 <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
              </svg>
              <span>Sair</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Wrapper for main content below header -->
      <div id="mainContentWrapper" style="padding-top: 10px;"> <!-- Add some padding -->

        <!-- Add Domain Status Message Placeholder -->
        <div id="domainStatusMessage" class="message" style="display: none; margin-top: 0;"></div> <!-- Remove margin-top here -->

        <!-- Add Container for Centering Extract Data Button -->
      <div id="extractButtonContainer" style="text-align: center; margin-top: 80px; display: none;"> <!-- Increased margin-top -->
        <button id="extractDataButton" class="primary-button" style="width: auto;">Extrair dados deste imóvel</button> <!-- Translated button text -->
      </div>

      <div id="propertyFormSection" style="display: none;">
        <div id="formHeader" class="form-header" style="display: none;">
          <p class="info-message">Este imóvel já está na sua carteira de análise. Confirme as informações e atualize caso necessário</p>
        </div>
        <form id="propertyForm">
          <div id="firstPhotoContainer"></div>
          
          <div class="form-row full-width">
            <div class="form-group">
              <label for="id_imovel">ID do Imóvel</label> <!-- Already PT -->
              <input type="text" id="id_imovel" name="id_imovel">
            </div>
          </div>

          <div class="form-row full-width">
            <div class="form-group">
              <label for="modalidade">Modalidade</label> <!-- Already PT -->
              <select id="modalidade" name="modalidade" class="form-select">
                <option value="">Selecione a modalidade</option> <!-- Already PT -->
                <option value="Venda Online">Venda Online</option> <!-- Already PT -->
                <option value="Venda Direta Online">Venda Direta Online</option> <!-- Already PT -->
                <option value="1º Leilão SFI">1º Leilão SFI</option> <!-- Already PT -->
                <option value="2º Leilão SFI">2º Leilão SFI</option> <!-- Already PT -->
                <option value="Licitação aberta">Licitação aberta</option> <!-- Already PT -->
                <option value="Leilão extrajudicial">Leilão extrajudicial</option> <!-- Already PT -->
                <option value="Leilão judicial">Leilão judicial</option> <!-- Already PT -->
                <option value="outro">Outro</option> <!-- Already PT -->
              </select>
            </div>
          </div>

          <div class="form-row full-width">
            <div class="form-group">
              <label for="tipo">Tipo do Imóvel</label> <!-- Already PT -->
              <input type="text" id="tipo" name="tipo">
            </div>
          </div>

          <div class="form-row full-width">
            <div class="form-group">
              <label for="endereco">Endereço</label> <!-- Already PT -->
              <input type="text" id="endereco" name="endereco">
            </div>
          </div>

          <div class="form-row three-columns">
            <div class="form-group">
              <label for="bairro">Bairro</label> <!-- Already PT -->
              <input type="text" id="bairro" name="bairro">
            </div>
            <div class="form-group">
              <label for="cidade">Cidade</label> <!-- Already PT -->
              <input type="text" id="cidade" name="cidade">
            </div>
            <div class="form-group">
              <label for="estado">Estado</label> <!-- Already PT -->
              <input type="text" id="estado" name="estado">
            </div>
          </div>

          <div class="form-row three-columns">
            <div class="form-group">
              <label for="area_total">Área Total (m²)</label> <!-- Already PT -->
              <input type="number" id="area_total" name="area_total">
            </div>
            <div class="form-group">
              <label for="area_privativa">Área Privativa (m²)</label> <!-- Already PT -->
              <input type="number" id="area_privativa" name="area_privativa">
            </div>
            <div class="form-group">
              <label for="area_terreno">Área Terreno (m²)</label> <!-- Already PT -->
              <input type="number" id="area_terreno" name="area_terreno">
            </div>
          </div>

          <div class="form-row full-width">
            <div class="form-group">
              <label for="quartos">Quartos</label> <!-- Already PT -->
              <input type="number" id="quartos" name="quartos">
            </div>
          </div>

          <div class="form-row two-columns">
            <div class="form-group">
              <label for="data_certame_1">Data 1º Leilão</label> <!-- Already PT -->
              <input type="text" id="data_certame_1" name="data_certame_1">
            </div>
            <div class="form-group">
              <label for="preco">Valor 1º Leilão</label> <!-- Already PT -->
              <input type="number" id="preco" name="preco">
            </div>
          </div>

          <div class="form-row two-columns">
            <div class="form-group">
              <label for="data_certame_2">Data 2º Leilão</label> <!-- Already PT -->
              <input type="text" id="data_certame_2" name="data_certame_2">
            </div>
            <div class="form-group">
              <label for="preco_2">Valor 2º Leilão</label> <!-- Already PT -->
              <input type="number" id="preco_2" name="preco_2">
            </div>
          </div>

          <div class="form-row two-columns">
            <div class="form-group">
              <label for="valor_avaliado">Valor Avaliado</label> <!-- Already PT -->
              <input type="number" id="valor_avaliado" name="valor_avaliado">
            </div>
            <div class="form-group">
              <label for="desconto">Desconto (%)</label> <!-- Already PT -->
              <input type="number" id="desconto" name="desconto">
            </div>
          </div>

          <div class="form-row two-columns">
            <div class="form-group">
              <label for="banco">Banco</label> <!-- Already PT -->
              <input type="text" id="banco" name="banco">
            </div>
            <div class="form-group">
              <label for="aceita_fhab">Aceita Financiamento</label> <!-- Already PT -->
              <select id="aceita_fhab" name="aceita_fhab" class="form-select">
                <option value="">Selecione</option> <!-- Already PT -->
                <option value="sim">Sim</option> <!-- Already PT -->
                <option value="não">Não</option> <!-- Already PT -->
              </select>
            </div>
          </div>

          <div class="form-row two-columns">
            <div class="form-group">
              <label for="link_edital">Link do Edital</label> <!-- Already PT -->
              <input type="url" id="link_edital" name="link_edital">
            </div>
            <div class="form-group">
              <label for="matricula">Matrícula</label> <!-- Already PT -->
              <input type="text" id="matricula" name="matricula">
            </div>
          </div>

          <div class="form-row full-width">
            <div class="form-group">
              <label for="outros">Outras Informações</label> <!-- Already PT -->
              <textarea id="outros" name="outros" rows="4"></textarea>
            </div>
          </div>

          <input type="hidden" id="fotos_imovel" name="fotos_imovel">
          <input type="hidden" id="link_pag" name="link_pag">
        </form>
      </div>

      <div id="confirmationSection" style="display: none;">
        <div class="button-group">
          <button id="confirmPropertyBtn" class="primary-button">Salvar imóvel na Carteira</button>
        </div>
      </div>

      </div> <!-- Close mainContentWrapper -->

      <div id="errorSection" style="display: none;">
        <div class="error-container">
          <h2>Ocorreu um erro</h2> <!-- Already PT -->
          <p id="errorMessage">Mensagem de erro aqui</p> <!-- Already PT -->
          <div class="button-group">
            <button id="closeErrorBtn" class="secondary-button">Fechar</button> <!-- Already PT -->
            <button id="logoutErrorBtn" class="primary-button">Sair</button> <!-- Already PT -->
          </div>
        </div>
      </div>
    `;
  }

  // Add styles
  addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      body {
        font-family: 'Inter', sans-serif;
        margin: 0;
        padding: 16px;
        background-color: #0A1929;
        color: #ffffff;
      }

      #loginSection.authenticated #emailFormGroup,
      #loginSection.authenticated #passwordFormGroup {
        display: none !important;
      }
      
      .logo-container {
        text-align: center;
        margin-bottom: 24px;
      }

      .logo {
        width: 200px;
        height: auto;
      }

      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        padding: 8px 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }

      .header-logo {
        height: 32px;
        width: auto;
      }

      .auth-form {
        padding: 20px;
        max-width: 400px;
        margin: 0 auto;
      }

      .form-group {
        margin-bottom: 20px;
      }

      .form-group input,
      .form-group textarea,
      .form-select {
        width: 100%;
        padding: 12px;
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 8px;
        background-color: #E1F3E5;
        color:rgb(32, 32, 32);
        font-size: 14px;
        transition: all 0.3s ease;
        box-sizing: border-box;
      }

      .form-group input:focus,
      .form-group textarea:focus,
      .form-select:focus {
        outline: none;
        border-color: #00E676;
        box-shadow: 0 0 0 2px rgba(0, 230, 118, 0.2);
      }

      .form-row {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 20px;
        margin-bottom: 20px;
      }

      .form-row.three-columns {
        grid-template-columns: repeat(3, 1fr);
      }

      .form-row.two-columns {
        grid-template-columns: repeat(2, 1fr);
      }

      .form-row.full-width {
        grid-template-columns: 1fr;
      }

      .primary-button {
        background-color: #00E676;
        color: #0A1929;
        padding: 12px 24px;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 600;
        width: 100%;
        transition: all 0.3s ease;
      }

      .primary-button:hover {
        background-color: #00c853;
        transform: translateY(-1px);
      }

      .secondary-button {
        background-color: transparent;
        color: #ffffff;
        padding: 8px 16px;
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.3s ease;
      }

      .secondary-button:hover {
        border-color: #00E676;
        color: #00E676;
      }

      .message {
        padding: 12px;
        margin-bottom: 16px;
        border-radius: 8px;
        font-size: 14px;
      }

      .message.error {
        background-color: rgba(244, 67, 54, 0.1);
        color: #f44336;
        border: 1px solid rgba(244, 67, 54, 0.2);
      }

      .message.success {
        background-color: rgba(0, 230, 118, 0.1);
        color: #00E676;
        border: 1px solid rgba(0, 230, 118, 0.2);
      }

      .form-header {
        margin-bottom: 20px;
        padding: 15px;
        background-color: rgba(0, 230, 118, 0.1);
        border-radius: 8px;
        border-left: 4px solid #00E676;
      }

      .info-message {
        margin: 0;
        color: #00E676;
        font-size: 14px;
        line-height: 1.4;
      }

      #propertyForm label,
      .form-group label {
        display: block;
        margin-bottom: 8px;
        color: #E1F3E5 !important;
        font-size: 14px;
        font-weight: 500;
      }

      .loading-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(10, 25, 41, 0.9) !important;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        z-index: 9999;
      }

      .loading-spinner {
        width: 40px;
        height: 40px;
        border: 4px solid rgba(255, 255, 255, 0.2);
        border-top: 4px solid #00E676;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-bottom: 10px;
      }

      .loading-text {
        color: #00E676 !important;
        font-size: 14px;
        font-weight: 500;
        text-align: center;
        margin-top: 10px;
      }

      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      #firstPhotoContainer {
        margin-bottom: 24px;
        width: 100%;
      }

      #firstPhotoContainer img {
        max-width: 100%;
        height: auto;
        border-radius: 8px;
        border: 1px solid rgba(255, 255, 255, 0.1);
      }

      textarea {
        min-height: 100px;
        resize: vertical;
      }

      input[type="number"] {
        -moz-appearance: textfield;
      }

      input[type="number"]::-webkit-outer-spin-button,
      input[type="number"]::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
      }

      .error-container {
        padding: 24px;
        text-align: center;
      }

      .error-container h2 {
        color: #f44336;
        margin-bottom: 16px;
      }

      .error-container p {
        margin-bottom: 24px;
      }

      .dynamic-domain-message {
        background-color: rgba(0, 230, 118, 0.1);
        padding: 12px;
        border-radius: 8px;
        margin-bottom: 16px;
      }

      /* Sidebar header styles */
      .sidebar-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 16px;
        background-color: #0A1929;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        gap: 10px;
        flex-wrap: wrap;
      }

      .header-logo-container {
        flex-shrink: 0;
      }

      .header-logo {
        height: 32px;
        width: auto;
      }

      .header-button-group {
        display: flex;
        gap: 8px;
        flex-grow: 1;
        justify-content: flex-end;
        flex-wrap: wrap;
      }

      .header-button-group .secondary-button {
        display: inline-flex; /* Use flex for alignment */
        align-items: center; /* Center items vertically */
        gap: 6px; /* Space between icon and text */
        padding: 6px 12px;
        font-size: 0.8rem;
        width: auto;
      }

      .header-button-group .secondary-button svg {
         width: 1.1em; /* Adjust icon size */
         height: 1.1em;
         fill: currentColor; /* Inherit button color */
      }

      /* Animation for message */
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      .message {
        animation: fadeIn 0.3s ease-in-out;
      }
    `;
    document.head.appendChild(style);
  }
}

// Export the service
export default UiService;
