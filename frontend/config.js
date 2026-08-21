// Configuration for Frontend API requests
if (typeof CONFIG === "undefined") {
  window.CONFIG = {
    // Set this to true to force localhost, false to force production, 
    // or null to automatically detect based on window.location
    USE_LOCALHOST: false,

    API_LOCAL: "http://localhost:5000",
    API_PROD: "https://crawllead.onrender.com",

    get API_URL() {
      if (this.USE_LOCALHOST === true) {
        return this.API_LOCAL;
      }
      if (this.USE_LOCALHOST === false) {
        return this.API_PROD;
      }

      // Auto-detect: if dashboard is running on localhost:5000 (served by local Flask backend), use local API
      const hostname = window.location.hostname;
      const port = window.location.port;
      if ((hostname === "localhost" || hostname === "127.0.0.1") && port === "5000") {
        return this.API_LOCAL;
      }
      return this.API_PROD;
    }
  };
}
