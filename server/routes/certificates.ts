import { Router, Response } from "express";
import { db } from "../db";
import { certificates, users, courses } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { generateCertificatePDF } from "../services/certificate";

export const certificatesRouter = Router();
certificatesRouter.use(requireAuth);

// GET /api/v1/certificates — list my certificates
certificatesRouter.get("/", async (req: AuthRequest, res: Response) => {
  const result = await db
    .select({
      id: certificates.id,
      certificateNumber: certificates.certificateNumber,
      earnedAt: certificates.earnedAt,
      pdfUrl: certificates.pdfUrl,
      courseTitle: courses.title,
      courseTitleHi: courses.titleHi,
      courseCategory: courses.category,
    })
    .from(certificates)
    .innerJoin(courses, eq(courses.id, certificates.courseId))
    .where(eq(certificates.userId, req.user!.id));

  res.json(result);
});

// GET /api/v1/certificates/:id/pdf — download PDF
certificatesRouter.get("/:id/pdf", async (req: AuthRequest, res: Response) => {
  const [cert] = await db
    .select({
      id: certificates.id,
      certificateNumber: certificates.certificateNumber,
      earnedAt: certificates.earnedAt,
      userId: certificates.userId,
      workerName: users.displayName,
      courseTitle: courses.title,
    })
    .from(certificates)
    .innerJoin(users, eq(users.id, certificates.userId))
    .innerJoin(courses, eq(courses.id, certificates.courseId))
    .where(
      and(
        eq(certificates.id, req.params.id),
        eq(certificates.userId, req.user!.id) // can only download own cert
      )
    )
    .limit(1);

  if (!cert) return res.status(404).json({ error: "Certificate not found" });

  const pdf = await generateCertificatePDF({
    certificateNumber: cert.certificateNumber,
    workerName: cert.workerName,
    courseTitle: cert.courseTitle,
    earnedAt: cert.earnedAt,
  });

  res.set({
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename="certificate-${cert.certificateNumber}.pdf"`,
    "Content-Length": pdf.length,
  });
  res.end(pdf);
});
