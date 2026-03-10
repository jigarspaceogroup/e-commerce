import { app } from "./app.js";

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.info(`API server running on http://localhost:${PORT}`);
  console.info(`Health check: http://localhost:${PORT}/api/v1/health`);
});
