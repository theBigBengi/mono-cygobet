import { FastifyPluginAsync } from "fastify";

const groupsJoinRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get<{ Querystring: { code?: string } }>(
    "/groups/join",
    async (req, reply) => {
      const code = req.query.code ?? "";
      const deepLink = `mobile://groups/join?code=${encodeURIComponent(code)}`;

      reply.header("Content-Type", "text/html; charset=utf-8");
      return reply.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Join Group - CygoBet</title>
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
    .code { font-size: 28px; font-weight: 800; letter-spacing: 4px; margin: 16px 0; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Join Group on CygoBet</h1>
    ${code ? `<div class="code">${code.replace(/[<>"'&]/g, "")}</div>` : ""}
    <p>Tap the button below to open the app and join the group.</p>
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

export default groupsJoinRoutes;
