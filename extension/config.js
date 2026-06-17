// Configuration for Extension API requests
if (typeof CONFIG === "undefined") {
  window.CONFIG = {
    // Set to true to use localhost, false to use production domain (https://crawllead.onrender.com)
    USE_LOCALHOST: true,

    API_LOCAL: "http://localhost:5000",
    API_PROD: "https://crawllead.onrender.com",

    DASHBOARD_LOCAL: "http://localhost:3000", // local dashboard address
    DASHBOARD_PROD: "https://crawllead.onrender.com", // production dashboard address

    get API_URL() {
      return this.USE_LOCALHOST ? this.API_LOCAL : this.API_PROD;
    },

    get DASHBOARD_URL() {
      return this.USE_LOCALHOST ? this.DASHBOARD_LOCAL : this.DASHBOARD_PROD;
    }
  };
}
