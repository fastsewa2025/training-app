import { Router, Response, Request } from "express";
import multer from "multer";
import { requireAuth, requireRole, AuthRequest } from "../middleware/auth";
import { uploadMedia } from "../services/upload";

export const uploadRouter = Router();
uploadRouter.use(requireAuth, requireRole("admin", "trainer"));

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

const MAX_SIZE = {
  image: 10 * 1024 * 1024,   // 10 MB
  video: 500 * 1024 * 1024,  // 500 MB
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE.video },
  fileFilter(_req, file, cb) {
    if (ALLOWED_MIME.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed`));
    }
  },
});

// POST /api/v1/upload/image
uploadRouter.post(
  "/image",
  upload.single("file"),
  async (req: AuthRequest, res: Response) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const isImage = req.file.mimetype.startsWith("image/");
    if (!isImage) return res.status(400).json({ error: "Image file required" });

    const folder =
      req.body.folder === "thumbnails" ? "thumbnails" : "images";

    const result = await uploadMedia(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      folder
    );

    res.json(result);
  }
);

// POST /api/v1/upload/video
uploadRouter.post(
  "/video",
  upload.single("file"),
  async (req: AuthRequest, res: Response) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const isVideo = req.file.mimetype.startsWith("video/");
    if (!isVideo) return res.status(400).json({ error: "Video file required" });

    const result = await uploadMedia(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      "videos"
    );

    res.json({
      ...result,
      provider: "cloudinary",
      // Client should set videoProvider = "cloudinary" when saving the lesson
    });
  }
);
