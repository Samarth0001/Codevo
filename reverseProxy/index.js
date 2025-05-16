const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");

const app = express();

app.use(async (req, res, next) => {
  try {
    const host = req.headers.host; // e.g., project123.codevo.dev
    const projectId = host.split(".")[0]; // "project123"
    
    // Forward to headless service name, K8s will resolve DNS internally
    const target = `http://${projectId}:3000`;
    console.log(`Proxying request to ${target}${req.url}`);

    const proxy = createProxyMiddleware({
      target,
      changeOrigin: true,
      ws: true,
      pathRewrite: (path, req) => path, // don't rewrite path
      onError: (err, req, res) => {
        console.error("Proxy error:", err);
        res.status(502).send("Project not ready or error occurred");
      },
    });

    return proxy(req, res, next);
  } catch (err) {
    console.error(err);
    return res.status(500).send("Internal error in router");
  }
});

app.listen(80, () => {
  console.log("router-repl listening on port 80");
});

