/**
 * Certificates: numbers, PDF rendering and the public verification URL.
 *
 * Numbers are 12 random characters from a 31-letter alphabet (~59 bits), so a
 * certificate cannot be guessed or enumerated (the previous format embedded a
 * timestamp and only 24 random bits). The PDF embeds Noto Sans / Noto Sans
 * Devanagari because PDFKit's built-in Helvetica cannot draw Hindi, and a QR
 * code that opens the public verification page.
 */
import { randomInt } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { inflateSync } from "node:zlib";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { config } from "../config";
import { ASSETS_DIR } from "../paths";

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateCertificateNumber(): string {
  const chunk = () => Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
  return `FSWA-${chunk()}-${chunk()}-${chunk()}`;
}

/** Accepts new numbers and the legacy `FSWA-<base36>-<hex>` format; returns the canonical form or null. */
export function parseCertificateNumber(input: string): string | null {
  const n = input.trim().toUpperCase().replace(/\s+/g, "");
  return /^FSWA-[A-Z0-9]{2,20}(-[A-Z0-9]{2,20}){1,3}$/.test(n) ? n : null;
}

export function verificationUrl(number: string, fallbackOrigin?: string): string {
  const base = config.publicBaseUrl ?? fallbackOrigin ?? "";
  return `${base}/verify/${number}`;
}

// ─── the issue date ─────────────────────────────────────────────────────────
/**
 * Certificates are dated in India time, everywhere: on the PDF, on the public check page and in its
 * JSON. (The page used to print the UTC date, so a certificate earned between midnight and 05:30 IST
 * showed a different day on the page than on the paper, which looks like a forgery to an employer.)
 */
export const CERTIFICATE_TIME_ZONE = "Asia/Kolkata";

/** "2026-10-24": the calendar day of issue in India time. */
export function issueDay(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: CERTIFICATE_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const part = (type: "year" | "month" | "day") => parts.find((p) => p.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

/** "24 October 2026", as printed on the certificate. */
export function issueDayLong(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: CERTIFICATE_TIME_ZONE }).format(date);
}

// ─── fonts ──────────────────────────────────────────────────────────────────
type FontKey = "sans" | "sansBold" | "deva" | "devaBold";
const FONT_FILES: Record<FontKey, string> = {
  sans: "NotoSans-Regular.woff",
  sansBold: "NotoSans-Bold.woff",
  deva: "NotoSansDevanagari-Regular.woff",
  devaBold: "NotoSansDevanagari-Bold.woff",
};
const fontCache = new Map<FontKey, Buffer>();
function fontBuffer(key: FontKey): Buffer {
  let buf = fontCache.get(key);
  if (!buf) {
    buf = woffToSfnt(readFileSync(join(ASSETS_DIR, "fonts", FONT_FILES[key])));
    fontCache.set(key, buf);
  }
  return buf;
}

/**
 * Unpacks a WOFF 1.0 font into the plain TrueType/OpenType file it wraps, once per process.
 *
 * PDFKit hands every new document a fresh copy of each font, and its font engine inflates WOFF tables
 * with a pure-JavaScript decompressor: that was more than half of the ~300 ms one certificate took,
 * time in which the API's single thread answered nobody else. Node's own zlib does it once, here.
 * Anything that is not WOFF is returned as it is.
 */
export function woffToSfnt(woff: Buffer): Buffer {
  if (woff.length < 44 || woff.toString("latin1", 0, 4) !== "wOFF") return woff;
  const flavor = woff.readUInt32BE(4);
  const numTables = woff.readUInt16BE(12);
  const tables: { tag: number; checksum: number; data: Buffer }[] = [];
  for (let i = 0; i < numTables; i++) {
    const entry = 44 + i * 20;
    const tag = woff.readUInt32BE(entry);
    const offset = woff.readUInt32BE(entry + 4);
    const compLength = woff.readUInt32BE(entry + 8);
    const origLength = woff.readUInt32BE(entry + 12);
    const checksum = woff.readUInt32BE(entry + 16);
    const stored = woff.subarray(offset, offset + compLength);
    const data = compLength < origLength ? inflateSync(stored) : Buffer.from(stored);
    if (data.length !== origLength) throw new Error("damaged WOFF font: a table has the wrong length");
    tables.push({ tag, checksum, data });
  }
  tables.sort((a, b) => a.tag - b.tag); // the OpenType table directory is sorted by tag
  const maxPow2 = 2 ** Math.floor(Math.log2(numTables));
  const header = Buffer.alloc(12 + 16 * numTables);
  header.writeUInt32BE(flavor, 0);
  header.writeUInt16BE(numTables, 4);
  header.writeUInt16BE(maxPow2 * 16, 6); // searchRange
  header.writeUInt16BE(Math.log2(maxPow2), 8); // entrySelector
  header.writeUInt16BE(numTables * 16 - maxPow2 * 16, 10); // rangeShift
  const parts: Buffer[] = [header];
  let offset = header.length;
  tables.forEach((table, i) => {
    const record = 12 + i * 16;
    header.writeUInt32BE(table.tag, record);
    header.writeUInt32BE(table.checksum, record + 4);
    header.writeUInt32BE(offset, record + 8);
    header.writeUInt32BE(table.data.length, record + 12);
    const padded = Buffer.alloc((table.data.length + 3) & ~3); // tables start on 4-byte boundaries
    table.data.copy(padded);
    parts.push(padded);
    offset += padded.length;
  });
  return Buffer.concat(parts);
}

/**
 * Neither font alone can print a Hindi title that contains "(PPE)" or "Level 2": Noto Sans has
 * no Devanagari, and the Devanagari font has no Latin letters, digits or brackets (they would be
 * drawn as empty boxes). Text is therefore split into runs and each run uses the font that has
 * its glyphs; a character neither font has (an emoji, another Indian script) is replaced.
 */
export interface Run {
  text: string;
  font: FontKey;
}
export interface GlyphTable {
  has(script: "sans" | "deva", codePoint: number): boolean;
}

const isDevanagariBlock = (cp: number) => cp >= 0x0900 && cp <= 0x097f;
const isJoiner = (cp: number) => cp === 0x200c || cp === 0x200d; // ZWNJ / ZWJ shape conjuncts

export function splitRuns(text: string, bold: boolean, glyphs: GlyphTable, replacement = ""): Run[] {
  const sans: FontKey = bold ? "sansBold" : "sans";
  const deva: FontKey = bold ? "devaBold" : "deva";
  const runs: Run[] = [];
  const add = (ch: string, font: FontKey) => {
    const last = runs[runs.length - 1];
    if (last && last.font === font) last.text += ch;
    else runs.push({ text: ch, font });
  };
  for (const raw of text.normalize("NFC")) {
    const cp = raw.codePointAt(0) ?? 0;
    if (/\s/u.test(raw)) add(" ", sans);
    else if (isJoiner(cp)) add(raw, runs.length > 0 ? runs[runs.length - 1].font : deva);
    else if (isDevanagariBlock(cp)) {
      if (glyphs.has("deva", cp)) add(raw, deva);
      else if (replacement) add(replacement, sans);
    } else if (glyphs.has("sans", cp)) add(raw, sans);
    else if (glyphs.has("deva", cp)) add(raw, deva); // e.g. the rupee sign lives only in the Devanagari font
    else if (replacement) add(replacement, sans);
  }
  return runs;
}

/** Asks PDFKit's own font engine which characters each embedded font can draw. */
function glyphTable(doc: InstanceType<typeof PDFDocument>): GlyphTable {
  type Engine = { hasGlyphForCodePoint?: (cp: number) => boolean };
  const probe = (key: FontKey) => {
    doc.font(key);
    const engine = (doc as unknown as { _font?: { font?: Engine } })._font?.font;
    return engine?.hasGlyphForCodePoint ? (cp: number) => engine.hasGlyphForCodePoint!(cp) : () => true;
  };
  const sans = probe("sans");
  const deva = probe("deva");
  return { has: (script, cp) => (script === "sans" ? sans(cp) : deva(cp)) };
}

export interface CertificateData {
  certificateNumber: string;
  holderName: string;
  courseTitle: string;
  courseTitleHi?: string | null;
  earnedAt: Date;
  /** Used for the QR code / printed URL when PUBLIC_BASE_URL is not configured (development). */
  fallbackOrigin?: string;
}

const BRAND = "#FF6B2C";
const ONE_LINE_MIN_SIZE = 14;
const MIN_FONT_SIZE = 10;

/**
 * Rendering takes ~100 ms of the API's only thread, and people open the same certificate more than
 * once (view, share, view again). The PDF depends only on these inputs, so recent ones are kept; a
 * rename or a different course title is a different key, and revoked certificates are never rendered.
 */
const PDF_CACHE_SIZE = 200;
const pdfCache = new Map<string, Buffer>();

export async function renderCertificatePdf(data: CertificateData): Promise<Buffer> {
  const verifyUrl = verificationUrl(data.certificateNumber, data.fallbackOrigin);
  const key = JSON.stringify([data.certificateNumber, data.holderName, data.courseTitle, data.courseTitleHi ?? null, data.earnedAt.toISOString(), verifyUrl]);
  const cached = pdfCache.get(key);
  if (cached) {
    pdfCache.delete(key); // most recently used goes to the end
    pdfCache.set(key, cached);
    return cached;
  }
  const pdf = await drawCertificatePdf(data, verifyUrl);
  pdfCache.set(key, pdf);
  if (pdfCache.size > PDF_CACHE_SIZE) pdfCache.delete(pdfCache.keys().next().value as string);
  return pdf;
}

async function drawCertificatePdf(data: CertificateData, verifyUrl: string): Promise<Buffer> {
  const qr = await QRCode.toBuffer(verifyUrl, { type: "png", margin: 1, width: 260, errorCorrectionLevel: "M" });

  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      layout: "landscape",
      margin: 0,
      info: {
        Title: `Certificate ${data.certificateNumber}`,
        Author: "FastSewa Construction Training",
        Subject: `Certificate of completion: ${data.courseTitle}`,
      },
    });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    try {
      (Object.keys(FONT_FILES) as FontKey[]).forEach((k) => doc.registerFont(k, fontBuffer(k)));

      const W = doc.page.width;
      const H = doc.page.height;
      const contentW = W - 2 * 90;

      const glyphs = glyphTable(doc);

      /**
       * Draws centred text. It is shrunk until it fits on one line (down to 14 pt); below that it is
       * wrapped onto at most three lines. Returns the y position below the text.
       */
      const centred = (text: string, y: number, size: number, bold: boolean, color: string, maxWidth = contentW) => {
        const base: FontKey = bold ? "sansBold" : "sans";
        const words = text.split(/\s+/u).filter(Boolean).map((word) => splitRuns(word, bold, glyphs, "?"));
        const width = (runs: Run[], s: number) => runs.reduce((sum, r) => sum + doc.font(r.font).fontSize(s).widthOfString(r.text), 0);
        const wrap = (s: number): Run[][] => {
          const space = doc.font(base).fontSize(s).widthOfString(" ");
          const lines: Run[][] = [];
          let line: Run[] = [];
          let lineWidth = 0;
          for (const word of words) {
            const w = width(word, s);
            if (line.length > 0 && lineWidth + space + w > maxWidth) {
              lines.push(line);
              line = [];
              lineWidth = 0;
            }
            if (line.length > 0) {
              line.push({ text: " ", font: base });
              lineWidth += space;
            }
            line.push(...word);
            lineWidth += w;
          }
          if (line.length > 0) lines.push(line);
          return lines;
        };

        let s = size;
        let lines = wrap(s);
        while (s > MIN_FONT_SIZE && (s > ONE_LINE_MIN_SIZE ? lines.length > 1 : lines.length > 3)) {
          s -= 1;
          lines = wrap(s);
        }

        let yy = y;
        for (const line of lines.slice(0, 3)) {
          let x = (W - width(line, s)) / 2;
          let lineHeight = 0;
          for (const run of line) {
            doc.font(run.font).fontSize(s).fillColor(color).text(run.text, x, yy, { lineBreak: false });
            x += doc.widthOfString(run.text);
            lineHeight = Math.max(lineHeight, doc.currentLineHeight(true));
          }
          yy += lineHeight;
        }
        return yy;
      };

      // background, double border, brand band
      doc.rect(0, 0, W, H).fill("#FFFDF7");
      doc.rect(18, 18, W - 36, H - 36).lineWidth(4).stroke(BRAND);
      doc.rect(26, 26, W - 52, H - 52).lineWidth(1).stroke(BRAND);
      doc.rect(0, 0, W, 76).fill(BRAND);
      centred("FASTSEWA CONSTRUCTION TRAINING", 28, 15, true, "#FFFFFF");

      let y = 104;
      y = centred("Certificate of Completion", y, 34, true, "#2C2C2C");
      y = centred("पूर्णता प्रमाण पत्र", y + 2, 17, false, "#777777");
      doc.moveTo(170, y + 12).lineTo(W - 170, y + 12).lineWidth(1.5).stroke(BRAND);

      y = centred("This certifies that", y + 28, 15, false, "#555555");
      y = centred(data.holderName, y + 8, 32, true, "#1A1A1A");
      y = centred("has successfully completed the course", y + 10, 15, false, "#555555");
      y = centred(data.courseTitle, y + 8, 24, true, BRAND);
      if (data.courseTitleHi) y = centred(data.courseTitleHi, y + 2, 17, false, "#777777");

      centred(`Issued on ${issueDayLong(data.earnedAt)}`, y + 14, 13, false, "#777777");

      // footer: number + verification on the left, QR on the right
      const footerY = H - 138;
      doc.moveTo(90, footerY - 8).lineTo(W - 90, footerY - 8).lineWidth(0.5).stroke("#CCCCCC");
      doc.font("sans").fontSize(10).fillColor("#666666").text(`Certificate No: ${data.certificateNumber}`, 90, footerY + 6, { width: W - 330 });
      doc.font("sans").fontSize(9).fillColor("#888888").text("Verify this certificate online:", 90, footerY + 24, { width: W - 330 });
      doc.font("sans").fontSize(9).fillColor(BRAND).text(verifyUrl, 90, footerY + 38, { width: W - 330, link: verifyUrl, underline: false });
      doc.image(qr, W - 90 - 84, footerY - 2, { width: 84, height: 84 });
      doc.font("sans").fontSize(7.5).fillColor("#888888").text("Scan to verify", W - 90 - 84, footerY + 84, { width: 84, align: "center" });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
