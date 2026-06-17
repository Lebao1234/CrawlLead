// Configuration for Frontend API requests
if (typeof CONFIG === "undefined") {
  window.CONFIG = {
    // Set this to true to force localhost, false to force production, 
    // or null to automatically detect based on window.location
    USE_LOCALHOST: null,

    API_LOCAL: "http://localhost:5000",
    API_PROD: "https://crawllead.onrender.com",

    get API_URL() {
      if (this.USE_LOCALHOST === true) {
        return this.API_LOCAL;
      }
      if (this.USE_LOCALHOST === false) {
        return this.API_PROD;
      }

      // Auto-detect: if dashboard is running on localhost/127.0.0.1, connect to local API
      const hostname = window.location.hostname;
      if (hostname === "localhost" || hostname === "127.0.0.1" || hostname.startsWith("192.168.")) {
        return this.API_LOCAL;
      }
      return this.API_PROD;
    }
  };
}
