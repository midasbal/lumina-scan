/**
 * Build script: Convert SVG logos to PNG and ICO formats.
 * Run: node scripts/build-logos.mjs
 */
import sharp from "sharp";
import pngToIco from "png-to-ico";
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(__dirname, "..", "public");

async function main() {
  console.log("🎨 Building logo assets...\n");

  // --- 1. Full logo (lumina-logo.svg → lumina-logo.png) ---
  const logoSvg = readFileSync(resolve(publicDir, "lumina-logo.svg"));
  await sharp(logoSvg)
    .resize(800, 240, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ quality: 100 })
    .toFile(resolve(publicDir, "lumina-logo.png"));
  console.log("✅ lumina-logo.png  (800×240)");

  // --- 2. Icon (lumina-icon.svg → lumina-icon.png) ---
  const iconSvg = readFileSync(resolve(publicDir, "lumina-icon.svg"));
  await sharp(iconSvg)
    .resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ quality: 100 })
    .toFile(resolve(publicDir, "lumina-icon.png"));
  console.log("✅ lumina-icon.png  (512×512)");

  // --- 3. Favicon sizes ---
  const sizes = [16, 32, 48, 64, 128, 256];
  const pngBuffers = [];

  for (const size of sizes) {
    const buf = await sharp(iconSvg)
      .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
    pngBuffers.push(buf);
  }

  // Convert to ICO
  const icoBuffer = await pngToIco(pngBuffers);
  writeFileSync(resolve(publicDir, "favicon.ico"), icoBuffer);
  console.log("✅ favicon.ico      (multi-size: 16–256)");

  // Also create app/favicon.ico for Next.js
  writeFileSync(resolve(__dirname, "..", "app", "favicon.ico"), icoBuffer);
  console.log("✅ app/favicon.ico  (Next.js auto-detect)\n");

  console.log("🎉 All logo assets built successfully!");
}

main().catch((err) => {
  console.error("❌ Build failed:", err);
  process.exit(1);
});
