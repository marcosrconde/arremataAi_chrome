// API Service for external requests
class ApiService {
  constructor() {
    this.baseUrl = 'https://n8n-n8n.apuc7z.easypanel.host/webhook';
  }

  // Check subscription status
  async checkSubscription(email) {
    try {
      console.log('Checking subscription for user:', email);
      
      const response = await fetch(`${this.baseUrl}/verify-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });

      if (!response.ok) {
        throw new Error(`Failed to check subscription status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Subscription check response:', data);
      
      // Convert string 'true' to boolean true
      const isActive = data.active === true || data.active === 'true';
      
      return {
        active: isActive,
        error: null
      };
    } catch (error) {
      console.error('Error checking subscription:', error);
      return {
        active: false,
        error: error.message
      };
    }
  }

  // Analyze property via n8n
  async analyzeProperty(url) {
    try {
      console.log('Sending request to n8n for property analysis...');
      const response = await fetch(`${this.baseUrl}/extrair-imovel`, {
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
}

// Export the service
export default ApiService;