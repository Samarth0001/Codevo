const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const { LRUCache } = require('lru-cache')
const app = express();

// Proxy cache (auto evicts unused after 10 mins)
const proxyCache = new LRUCache({
  max: 1000,               // max number of cached proxies
  ttl: 1000 * 60 * 10,     // 10 minutes inactivity TTL
});


function getProxy(projectId, port) {
  const key = `${projectId}:${port}`;
  let proxy = proxyCache.get(key);

  if (!proxy) {
    // Forward to headless service name, K8s will resolve DNS internally
    const target = `http://${projectId}.default.svc.cluster.local:${port}`;
    console.log(`Creating new proxy middleware for ${target}`);

    proxy = createProxyMiddleware({
      target,
      changeOrigin: true,
      ws: true,
      pathRewrite: (path) => path, // don't rewrite path
      onError: (err, req, res) => {
        console.error(`[${new Date().toISOString()}] Proxy error:`, err.message);
        res.status(502).send("Project not ready or proxy error");
      },
    });

    proxyCache.set(key, proxy);
  }

  return proxy;
}

app.use(async (req, res, next) => {
  console.log(`[${new Date().toISOString()}] Incoming request:`, req.method, req.url, req.headers.host);
  try {
    const host = req.headers.host; // e.g., project123.codevo.dev
    if (!host || !host.includes(".")) {
      return res.status(400).send("Invalid host header");
    }
    
    const projectId = host.split(".")[0]; // "project123"

    // Route based on path prefix
    let port;
    if (req.url.startsWith("/preview")) {
      port = 5173;
    } else if (req.url.startsWith("/user")) {
      port = 3000;
    } else {
      return res.status(404).send("Invalid route path");
    }
    
    // Get or create proxy for this project and port
    const proxy = getProxy(projectId, port);
    return proxy(req, res, next);

  } catch (err) {
    console.error(err);
    return res.status(500).send("Internal error in router");
  }
});

const server = app.listen(80, () => {
  console.log("router-repl listening on port 80");
});

// Forward upgrade requests to the proxy
server.on('upgrade', (req, socket, head) => {
  const host = req.headers.host;
  console.log(`[${new Date().toISOString()}] Upgrade request:`, req.url, host);
  // Extract projectId and port as in your middleware
  if (!host || !host.includes(".")) {
    socket.destroy();
    return;
  }
  const projectId = host.split(".")[0];
  let port;
  if (req.url.startsWith("/preview")) {
    port = 5173;
  } else if (req.url.startsWith("/user")) {
    port = 3000;
  } else {
    socket.destroy();
    return;
  }
  const proxy = getProxy(projectId, port);
  proxy.upgrade(req, socket, head);
});

