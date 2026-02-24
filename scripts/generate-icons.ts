/**
 * Generates PWA icons for the app.
 *
 * Creates 192x192 and 512x512 PNG icons with a simple branded design:
 * dark blue background with a white open book symbol.
 *
 * Run with: npx tsx scripts/generate-icons.ts
 * Requires: canvas (npm install --save-dev canvas)
 */

import { createCanvas } from "canvas";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const ROOT = join(import.meta.dirname!, "..");
const OUTPUT_DIR = join(ROOT, "public/icons");

function generateIcon(size: number, filename: string) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");

  // Background — dark navy blue
  ctx.fillStyle = "#1e3a5f";
  // Rounded rectangle (full canvas with slight rounding)
  const radius = size * 0.15;
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(size - radius, 0);
  ctx.quadraticCurveTo(size, 0, size, radius);
  ctx.lineTo(size, size - radius);
  ctx.quadraticCurveTo(size, size, size - radius, size);
  ctx.lineTo(radius, size);
  ctx.quadraticCurveTo(0, size, 0, size - radius);
  ctx.lineTo(0, radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.closePath();
  ctx.fill();

  // Draw an open book symbol
  const cx = size / 2;
  const cy = size * 0.48;
  const bookW = size * 0.55;
  const bookH = size * 0.4;

  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = size * 0.025;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Left page
  ctx.beginPath();
  ctx.moveTo(cx, cy - bookH * 0.05);
  ctx.quadraticCurveTo(
    cx - bookW * 0.3,
    cy - bookH * 0.15,
    cx - bookW * 0.5,
    cy - bookH * 0.35,
  );
  ctx.lineTo(cx - bookW * 0.5, cy + bookH * 0.45);
  ctx.quadraticCurveTo(
    cx - bookW * 0.3,
    cy + bookH * 0.35,
    cx,
    cy + bookH * 0.45,
  );
  ctx.stroke();

  // Right page
  ctx.beginPath();
  ctx.moveTo(cx, cy - bookH * 0.05);
  ctx.quadraticCurveTo(
    cx + bookW * 0.3,
    cy - bookH * 0.15,
    cx + bookW * 0.5,
    cy - bookH * 0.35,
  );
  ctx.lineTo(cx + bookW * 0.5, cy + bookH * 0.45);
  ctx.quadraticCurveTo(
    cx + bookW * 0.3,
    cy + bookH * 0.35,
    cx,
    cy + bookH * 0.45,
  );
  ctx.stroke();

  // Spine line
  ctx.beginPath();
  ctx.moveTo(cx, cy - bookH * 0.05);
  ctx.lineTo(cx, cy + bookH * 0.45);
  ctx.stroke();

  // Text lines on left page (decorative)
  ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
  ctx.lineWidth = size * 0.012;
  for (let i = 0; i < 4; i++) {
    const y = cy + bookH * (0.05 + i * 0.09);
    const indent = size * 0.03 * (i % 2);
    ctx.beginPath();
    ctx.moveTo(cx - bookW * 0.4 + indent, y);
    ctx.lineTo(cx - bookW * 0.05, y);
    ctx.stroke();
  }

  // Text lines on right page (decorative)
  for (let i = 0; i < 4; i++) {
    const y = cy + bookH * (0.05 + i * 0.09);
    const indent = size * 0.03 * (i % 2);
    ctx.beginPath();
    ctx.moveTo(cx + bookW * 0.05, y);
    ctx.lineTo(cx + bookW * 0.4 - indent, y);
    ctx.stroke();
  }

  // Small cross above the book
  const crossY = cy - bookH * 0.55;
  const crossSize = size * 0.08;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = size * 0.02;
  ctx.beginPath();
  ctx.moveTo(cx, crossY - crossSize);
  ctx.lineTo(cx, crossY + crossSize);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - crossSize * 0.65, crossY - crossSize * 0.15);
  ctx.lineTo(cx + crossSize * 0.65, crossY - crossSize * 0.15);
  ctx.stroke();

  // "OEB" text at the bottom
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold ${size * 0.09}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Open Bible Ministry", cx, size * 0.82);

  // Save
  const buffer = canvas.toBuffer("image/png");
  const outPath = join(OUTPUT_DIR, filename);
  writeFileSync(outPath, buffer);
  console.log(`  ${filename} (${size}x${size})`);
}

mkdirSync(OUTPUT_DIR, { recursive: true });
console.log("Generating PWA icons...\n");
generateIcon(192, "icon-192x192.png");
generateIcon(512, "icon-512x512.png");
console.log("\nDone!");
