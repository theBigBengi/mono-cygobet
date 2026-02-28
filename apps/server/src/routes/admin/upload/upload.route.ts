import { FastifyPluginAsync } from "fastify";
import { put } from "@vercel/blob";

const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
]);

const uploadRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /admin/upload/badge-image
  fastify.post("/badge-image", async (req, reply) => {
    const file = await req.file();

    if (!file) {
      return reply.status(400).send({
        status: "error",
        message: "No file uploaded",
      });
    }

    if (!ALLOWED_TYPES.has(file.mimetype)) {
      return reply.status(400).send({
        status: "error",
        message: "Invalid file type. Allowed: png, jpg, webp, svg",
      });
    }

    const buffer = await file.toBuffer();

    if (buffer.length > 2 * 1024 * 1024) {
      return reply.status(400).send({
        status: "error",
        message: "File too large. Max 2MB",
      });
    }

    const filename = `badges/${Date.now()}-${file.filename}`;
    const blob = await put(filename, buffer, { access: "public" });

    return reply.send({
      status: "success",
      data: { url: blob.url },
      message: "Badge image uploaded",
    });
  });
};

export default uploadRoutes;
