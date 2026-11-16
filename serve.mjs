import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 4173);

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".wav": "audio/wav",
  ".mp3": "audio/mpeg",
  ".webm": "video/webm",
  ".json": "application/json",
};

http.createServer((request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host}`);
  const requestedPath = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  const resolved = path.resolve(root, `.${requestedPath}`);

  if (!resolved.startsWith(root + path.sep)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  fs.stat(resolved, (statError, stats) => {
    if (statError || !stats.isFile()) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    const extension = path.extname(resolved).toLowerCase();
    const range = request.headers.range;
    const headers = {
      "Content-Type": types[extension] || "application/octet-stream",
      "Accept-Ranges": "bytes",
      "Cache-Control": extension === ".webp" ? "public, max-age=3600" : "no-cache",
    };

    if (range) {
      const [startValue, endValue] = range.replace("bytes=", "").split("-");
      const start = Number(startValue || 0);
      const end = endValue ? Math.min(Number(endValue), stats.size - 1) : stats.size - 1;
      if (!Number.isFinite(start) || start < 0 || start > end) {
        response.writeHead(416, { "Content-Range": `bytes */${stats.size}` });
        response.end();
        return;
      }
      response.writeHead(206, {
        ...headers,
        "Content-Length": end - start + 1,
        "Content-Range": `bytes ${start}-${end}/${stats.size}`,
      });
      fs.createReadStream(resolved, { start, end }).pipe(response);
      return;
    }

    response.writeHead(200, {
      ...headers,
      "Content-Length": stats.size,
    });
    fs.createReadStream(resolved).pipe(response);
  });
}).listen(port, "127.0.0.1", () => {
  console.log(`顺风化吉样片已启动：http://127.0.0.1:${port}`);
});
