const Functions = require('firebase-functions');

const cors = require('cors')({ origin: true });

module.exports = {
  hello: Functions.https.onRequest((req, res) =>
    cors(req, res, () =>
      res.send('Hello'),
    ),
  ),
};
