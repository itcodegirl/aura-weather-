import { createServer } from "node:http";
import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { chromium } from "playwright";
import lighthouse from "lighthouse";
import { launch } from "chrome-launcher";

const cwd = process.cwd();
const distDir = resolve(cwd, "dist");
const reportDir = resolve(cwd, "lhci-reports");
const budgetFile = resolve(cwd, "config", "lighthouse-budgets.json");
const chromeProfileDir = resolve(cwd, ".lighthouseci", "chrome-profile");

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

function sendResponse(res, statusCode, body, contentType = "text/plain; charset=utf-8") {
  res.writeHead(statusCode, { "content-type": contentType });
  res.end(body);
}

async function serveStaticAsset(urlPath, res) {
  const normalizedPath = normalize(urlPath).replace(/^(\.\.(\/|\\|$))+/, "");
  const requestPath = normalizedPath === "/" ? "/index.html" : normalizedPath;
  let filePath = resolve(distDir, `.${requestPath}`);

  if (!filePath.startsWith(distDir)) {
    sendResponse(res, 403, "Forbidden");
    return;
  }

  try {
    const fileStats = await stat(filePath);
    if (fileStats.isDirectory()) {
      filePath = join(filePath, "index.html");
    }
  } catch {
    const hasExtension = extname(filePath) !== "";
    if (hasExtension) {
      sendResponse(res, 404, "Not found");
      return;
    }
    filePath = join(distDir, "index.html");
  }

  try {
    const fileBuffer = await readFile(filePath);
    const mimeType = mimeTypes[extname(filePath)] || "application/octet-stream";
    sendResponse(res, 200, fileBuffer, mimeType);
  } catch {
    sendResponse(res, 404, "Not found");
  }
}

async function createStaticServer() {
  const server = createServer(async (req, res) => {
    try {
      const requestUrl = new URL(req.url || "/", "http://127.0.0.1");
      await serveStaticAsset(requestUrl.pathname, res);
    } catch {
      sendResponse(res, 500, "Server error");
    }
  });

  await new Promise((resolveServer, rejectServer) => {
    server.once("error", rejectServer);
    server.listen(0, "127.0.0.1", () => resolveServer());
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to bind local static server for Lighthouse.");
  }

  return {
    close: () =>
      new Promise((resolveClose, rejectClose) => {
        server.close((error) => {
          if (error) rejectClose(error);
          else resolveClose();
        });
      }),
    port: address.port,
  };
}

function formatScore(score) {
  return `${Math.round(score * 100)} / 100`;
}

async function run() {
  const budgetConfig = JSON.parse(await readFile(budgetFile, "utf-8"));
  const categoryBudgets = budgetConfig?.categories || {};
  const categories = Object.keys(categoryBudgets);

  if (!categories.length) {
    throw new Error("No Lighthouse category budgets were defined.");
  }

  const chromeExecutablePath = chromium.executablePath();
  await mkdir(chromeProfileDir, { recursive: true });
  await mkdir(reportDir, { recursive: true });

  const server = await createStaticServer();
  const chrome = await launch({
    chromePath: chromeExecutablePath,
    logLevel: "silent",
    userDataDir: chromeProfileDir,
    chromeFlags: ["--headless=new", "--disable-gpu", "--no-sandbox"],
  });

  try {
    const targetUrl = `http://127.0.0.1:${server.port}/index.html`;
    const runResult = await lighthouse(targetUrl, {
      formFactor: "desktop",
      logLevel: "error",
      onlyCategories: categories,
      output: ["json", "html"],
      port: chrome.port,
      screenEmulation: {
        mobile: false,
        width: 1365,
        height: 940,
        deviceScaleFactor: 1,
        disabled: false,
      },
    });

    if (!runResult || !runResult.lhr) {
      throw new Error("Lighthouse did not return a valid report.");
    }

    const reports = Array.isArray(runResult.report) ? runResult.report : [runResult.report];
    const [jsonReport = "", htmlReport = ""] = reports;
    if (jsonReport) {
      await writeFile(join(reportDir, "lighthouse-report.json"), jsonReport, "utf-8");
    }
    if (htmlReport) {
      await writeFile(join(reportDir, "lighthouse-report.html"), htmlReport, "utf-8");
    }

    const failedCategories = [];
    for (const categoryId of categories) {
      const score = runResult.lhr.categories?.[categoryId]?.score;
      const minimum = Number(categoryBudgets[categoryId]);
      if (!Number.isFinite(score)) {
        failedCategories.push(`${categoryId}: missing score`);
        continue;
      }

      console.log(
        `[lighthouse] ${categoryId}: ${formatScore(score)} (budget ${formatScore(minimum)})`
      );
      if (score < minimum) {
        failedCategories.push(
          `${categoryId}: ${formatScore(score)} is below budget ${formatScore(minimum)}`
        );
      }
    }

    if (failedCategories.length) {
      throw new Error(`Lighthouse budget check failed: ${failedCategories.join("; ")}`);
    }
  } finally {
    await chrome.kill();
    await server.close();
  }
}

run().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
