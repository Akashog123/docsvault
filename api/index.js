let appPromise;

function loadApp() {
  if (!appPromise) {
    appPromise = import('../server/src/app.js').then((mod) => mod.default);
  }
  return appPromise;
}

module.exports = async (req, res) => {
  try {
    const app = await loadApp();
    app(req, res);
  } catch (error) {
    console.error('Function error:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: error.message }));
  }
};
