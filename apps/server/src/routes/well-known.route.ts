import { FastifyPluginAsync } from "fastify";

const wellKnownRoutes: FastifyPluginAsync = async (fastify) => {
  // iOS Universal Links
  fastify.get("/.well-known/apple-app-site-association", async (_req, reply) => {
    reply.header("Content-Type", "application/json");
    return {
      applinks: {
        apps: [],
        details: [
          {
            appID: "LUMW3GT7N8.com.cygobet.mobile",
            paths: ["/groups/join*"],
          },
        ],
      },
    };
  });

  // Android App Links
  fastify.get("/.well-known/assetlinks.json", async (_req, reply) => {
    reply.header("Content-Type", "application/json");
    return [
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: "com.cygobet.mobile",
          sha256_cert_fingerprints: [
            "D8:23:FA:BE:C6:0C:EC:78:C8:C4:AD:4A:A9:41:72:5A:6A:D8:3C:4A:87:B9:87:6C:F2:A2:5C:03:7D:80:EC:49",
          ],
        },
      },
    ];
  });
};

export default wellKnownRoutes;
