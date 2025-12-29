import { buildApp } from "./app";

async function main() {
  const app = await buildApp();
  await app.listen({ port: 4000, host: "0.0.0.0" });
  console.log("API running on http://localhost:4000");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
