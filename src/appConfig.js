// Central configuration for the app.
//
// You can override these values at build time with Vite environment variables
// (see README.md), or edit the defaults below.
import pkg from "../package.json";

const env = import.meta.env || {};
const clean = (value) => (typeof value === "string" ? value.trim() : "");

export const APP_VERSION = pkg.version;

export const APP_CONFIG = {
  appName: "Rhema Class Timer",
  websiteUrl: "https://rhemangtimer.vercel.app",

  // Feedback opens the user's email app with a pre-filled message.
  // Change this address, or set VITE_FEEDBACK_EMAIL when building.
  feedbackEmail: clean(env.VITE_FEEDBACK_EMAIL) || "admin@rhemanigeria.com",

  // Optional: a URL that accepts a POST with the feedback JSON. When set, the
  // app sends feedback directly instead of opening the email app. For example a
  // Formspree endpoint. Set VITE_FEEDBACK_ENDPOINT when building.
  feedbackEndpoint: clean(env.VITE_FEEDBACK_ENDPOINT),

  // URL of the update manifest (updates.json). The GitHub Actions workflow sets
  // this automatically to the latest GitHub Release asset. For local builds you
  // can set VITE_UPDATE_MANIFEST_URL, or leave it empty to disable update checks.
  updateManifestUrl: clean(env.VITE_UPDATE_MANIFEST_URL),
};
