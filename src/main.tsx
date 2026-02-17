import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n/config";

// Suppress expected errors from browser console
if (typeof window !== "undefined") {
  const originalError = console.error;
  console.error = (...args: any[]) => {
    const message = args[0]?.toString() || "";
    const fullMessage = args.map(a => String(a)).join(" ");
    
    // Filter out source map errors from browser extensions
    if (
      message.includes("Source map error") ||
      message.includes("installHook.js.map") ||
      (message.includes("JSON.parse") && message.includes("source map"))
    ) {
      return; // Suppress these errors
    }
    
    // Filter out expected 404 errors for nurse profile resolution and task endpoints
    if (
      fullMessage.includes("404") &&
      (
        fullMessage.includes("nurses/me/") ||
        fullMessage.includes("nurses/by-user/") ||
        fullMessage.includes("tasks/to-do/by_id/") ||
        fullMessage.includes("tasks/done/by_id/") ||
        fullMessage.includes("tasks/done/today/by_id/")
      )
    ) {
      return; // Suppress expected 404s
    }
    
    originalError.apply(console, args);
  };
}

// Wait for CSS to load before revealing content
if (typeof window !== "undefined") {
  // Mark root as loaded after CSS and fonts are ready
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      requestAnimationFrame(() => {
        document.getElementById("root")?.classList.add("loaded");
      });
    });
  } else {
    // Fallback for browsers without font loading API
    window.addEventListener("load", () => {
      requestAnimationFrame(() => {
        document.getElementById("root")?.classList.add("loaded");
      });
    });
  }
}

createRoot(document.getElementById("root")!).render(<App />);
