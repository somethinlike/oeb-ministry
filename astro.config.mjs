import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import vercel from "@astrojs/vercel";
import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
export default defineConfig({
  // SSR mode — pages are server-rendered by default, which lets us
  // check auth state before sending HTML to the browser.
  output: "server",


  // Vercel handles hosting and serverless functions for SSR pages.
  adapter: vercel(),

  // Integrations add framework support to Astro's island architecture.
  integrations: [
    // React lets us use .tsx components as interactive "islands"
    // inside otherwise static Astro pages.
    react(),
  ],

  vite: {
    plugins: [
      // Tailwind CSS v4 integrates as a Vite plugin (not a PostCSS plugin
      // like v3). This scans our files and generates utility classes.
      tailwindcss(),
    ],
  },
});
