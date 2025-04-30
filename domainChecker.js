// Domain Checker Service
class DomainCheckerService {
  constructor() {
    this.cachedDomains = null;
  }

  // Get domain from URL
  getDomainFromUrl(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace(/^www\./, ''); // remove "www." part if it exists
    } catch (error) {
      console.error('Invalid URL:', url);
      return null;
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

  // Check if domain is in leiloeiros.csv
  async isDomainInLeiloeirosList(domain) {
    try {
      // Check local cache first
      if (this.cachedDomains) {
        return this.cachedDomains.includes(domain);
      }

      // Check chrome storage cache
      const cacheData = await chrome.storage.local.get('leiloeirosDomains');
      if (cacheData.leiloeirosDomains) {
        this.cachedDomains = cacheData.leiloeirosDomains;
        return this.cachedDomains.includes(domain);
      }

      // If no cache is available, load from CSV
      const domains = await this.loadDomainsFromCsv();
      return domains.includes(domain);
    } catch (error) {
      console.error('Error checking domain in leiloeiros list:', error);
      return false;
    }
  }

  // Load domains from CSV
  async loadDomainsFromCsv() {
    try {
      const response = await fetch(chrome.runtime.getURL('data/leiloeiros.csv'));
      const csvText = await response.text();
      // Split by newline, trim each line, filter empty lines, then skip header
      const lines = csvText.split(/\r?\n/) // Handles both \n and \r\n
                         .map(line => line.trim()) // Trim whitespace from each line
                         .filter(line => line.length > 0) // Remove empty lines
                         .slice(1); // Skip the first line (header row)

      const domains = lines.map(line => {
        const url = line.replace(/"/g, '').trim(); // Remove quotes and trim again
        // Check if url is not empty after cleaning
        if (!url) return null;
        try {
          // Ensure getDomainFromUrl handles potential errors gracefully too
          return this.getDomainFromUrl(url);
        } catch (innerError) {
          console.warn(`Could not parse domain from CSV line: "${line}"`, innerError);
          return null; // Skip invalid lines
        }
      }).filter(domain => domain !== null); // Filter out nulls from invalid lines

      // Cache the domains for future use
      this.cachedDomains = domains;
      await chrome.storage.local.set({ leiloeirosDomains: domains });

      console.log("Loaded domains from CSV:", domains); // Add logging
      return domains;
    } catch (error) {
      console.error('Error loading domains from CSV:', error);
      return [];
    }
  }
}

// Export the service
export default DomainCheckerService;
