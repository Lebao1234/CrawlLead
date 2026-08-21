// Configuration & Helper Utilities for Extension
if (typeof CONFIG === "undefined") {
  window.CONFIG = {
    // Tự động bật/tắt Debug Log trên Extension (Production mode: false)
    DEBUG: false,

    // Set to true to use localhost, false to use production domain
    USE_LOCALHOST: false,

    API_LOCAL: "http://localhost:5000",
    API_PROD: "https://crawllead.onrender.com",

    DASHBOARD_LOCAL: "http://localhost:3000",
    DASHBOARD_PROD: "https://crawllead.onrender.com",

    get API_URL() {
      return this.USE_LOCALHOST ? this.API_LOCAL : this.API_PROD;
    },

    get DASHBOARD_URL() {
      return this.USE_LOCALHOST ? this.DASHBOARD_LOCAL : this.DASHBOARD_PROD;
    },

    log(...args) {
      if (this.DEBUG) console.log("[LeadFinder]", ...args);
    },

    warn(...args) {
      console.warn("[LeadFinder]", ...args);
    },

    error(...args) {
      console.error("[LeadFinder]", ...args);
    }
  };
}
