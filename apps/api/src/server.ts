import "dotenv/config";
import { createApp } from "./app.js";

const app = await createApp();
const port = Number(process.env.PORT ?? 3001);
await app.listen({ host: "0.0.0.0", port });

const close = async () => {
  await app.close();
  process.exit(0);
};
process.on("SIGINT", close);
process.on("SIGTERM", close);
