const app = require("./app");
const config = require("./config");
const prisma = require("./lib/prisma");

const server = app.listen(config.port, () => {
  console.log(`API berjalan di http://localhost:${config.port}`);
});

async function shutdown() {
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
