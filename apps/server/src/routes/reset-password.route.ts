import { FastifyPluginAsync } from "fastify";

const resetPasswordRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get<{ Querystring: { token?: string } }>(
    "/reset-password",
    async (req, reply) => {
      const token = req.query.token ?? "";
      const deepLink = `mobile://reset-password?token=${encodeURIComponent(token)}`;

      reply.header("Content-Type", "text/html; charset=utf-8");
      return reply.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Reset Password - CygoBet</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: #f5f5f5;
      color: #333;
    }
    .card {
      background: #fff;
      border-radius: 16px;
      padding: 40px 32px;
      text-align: center;
      max-width: 400px;
      width: 90%;
      box-shadow: 0 2px 12px rgba(0,0,0,0.08);
    }
    h1 { font-size: 22px; margin-bottom: 12px; }
    p { font-size: 15px; color: #666; margin-bottom: 24px; }
    .btn {
      display: inline-block;
      background: #007AFF;
      color: #fff;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>Reset Your Password</h1>
    <p>Tap the button below to open the app and set a new password.</p>
    <a class="btn" id="open" href="${deepLink}">Open in App</a>
  </div>
  <script>
    // Try to open the app automatically
    window.location.href = ${JSON.stringify(deepLink)};
  </script>
</body>
</html>`);
    }
  );
};

export default resetPasswordRoutes;
