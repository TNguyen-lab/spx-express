import dotenv from 'dotenv';
import { createApp } from './app/create-app.js';
import { registerRoutes } from './app/register-routes.js';
import { registerEventHandlers, startOutboxProcessor } from './app/bootstrap-events.js';

// Load environment variables
dotenv.config();

const app = createApp();
const PORT = process.env.PORT || 3000;

// Routes
registerRoutes(app);

// Error handling middleware
app.use((err: Error, _req: unknown, res: any, _next: unknown) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

registerEventHandlers();
startOutboxProcessor();

// Start server
app.listen(PORT, () => {
  console.log(`🚀 SPX Express Backend running on port ${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/health`);
});

export default app;
