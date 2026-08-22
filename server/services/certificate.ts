import { randomBytes } from "crypto";

export function generateCertificateNumber(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rnd = randomBytes(3).toString("hex").toUpperCase();
  return `FSWA-${ts}-${rnd}`;
}

export async function generateCertificatePDF(data: {
  certificateNumber: string;
  workerName: string;
  courseTitle: string;
  earnedAt: Date;
}): Promise<Buffer> {
  // Dynamic import so it doesn't fail if pdfkit not installed yet
  const PDFDocument = (await import("pdfkit")).default;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      layout: "landscape",
      margins: { top: 50, bottom: 50, left: 72, right: 72 },
    });

    const buffers: Buffer[] = [];
    doc.on("data", (c: Buffer) => buffers.push(c));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);

    const W = doc.page.width;
    const H = doc.page.height;

    // Background
    doc.rect(0, 0, W, H).fill("#FFFDF7");

    // Outer border
    doc.rect(18, 18, W - 36, H - 36).lineWidth(4).stroke("#FF6B2C");
    doc.rect(26, 26, W - 52, H - 52).lineWidth(1).stroke("#FF6B2C");

    // Header band
    doc.rect(0, 0, W, 80).fill("#FF6B2C");

    // Brand
    doc
      .fillColor("#FFFFFF")
      .fontSize(14)
      .font("Helvetica-Bold")
      .text("FASTSEWA CONSTRUCTION TRAINING", 0, 28, { align: "center" });

    // Title
    doc
      .fillColor("#2C2C2C")
      .fontSize(36)
      .font("Helvetica-Bold")
      .text("Certificate of Completion", 0, 110, { align: "center" });

    // Divider
    doc
      .moveTo(160, 158)
      .lineTo(W - 160, 158)
      .lineWidth(1.5)
      .stroke("#FF6B2C");

    // Body text
    doc
      .fillColor("#555555")
      .fontSize(16)
      .font("Helvetica")
      .text("This certifies that", 0, 174, { align: "center" });

    // Worker name
    doc
      .fillColor("#1A1A1A")
      .fontSize(32)
      .font("Helvetica-Bold")
      .text(data.workerName, 0, 202, { align: "center" });

    doc
      .fillColor("#555555")
      .fontSize(16)
      .font("Helvetica")
      .text("has successfully completed the course", 0, 248, { align: "center" });

    // Course title
    doc
      .fillColor("#FF6B2C")
      .fontSize(24)
      .font("Helvetica-Bold")
      .text(data.courseTitle, 0, 276, { align: "center" });

    // Date
    const dateStr = new Date(data.earnedAt).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    doc
      .fillColor("#777777")
      .fontSize(13)
      .font("Helvetica")
      .text(`Issued on ${dateStr}`, 0, 322, { align: "center" });

    // Footer line
    doc
      .moveTo(160, H - 80)
      .lineTo(W - 160, H - 80)
      .lineWidth(0.5)
      .stroke("#CCCCCC");

    // Certificate number
    doc
      .fillColor("#AAAAAA")
      .fontSize(9)
      .text(`Certificate No: ${data.certificateNumber}`, 0, H - 65, {
        align: "center",
      });

    doc.end();
  });
}
