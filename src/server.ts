import app from './app.js';

const PORT = Number(process.env.PORT || 5000);
app.listen(PORT, '0.0.0.0', () => {
  console.info(`Care Diagnostics API running on port ${PORT}`);
});
