import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig(({ mode }) => {
  const { API_PORT = "3001" } = loadEnv(mode, projectRoot, "");
  const apiPort = Number(API_PORT);
  if (!Number.isInteger(apiPort) || apiPort < 1 || apiPort > 65535) {
    throw new Error("API_PORT must be an integer between 1 and 65535.");
  }

  return {
    root: `${projectRoot}client`,
    plugins: [react(), tailwindcss()],
    server: {
      host: "0.0.0.0",
      port: 5173,
      proxy: {
        "/api": {
          target: `http://localhost:${apiPort}`,
          configure(proxy) {
            proxy.on("proxyReq", (proxyRequest, request) => {
              const host = request.headers.host;
              if (host) proxyRequest.setHeader("x-forwarded-host", host);
            });
          },
        },
      },
    },
    build: {
      outDir: `${projectRoot}dist`,
      emptyOutDir: true,
    },
  };
});