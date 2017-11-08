const Functions = require('firebase-functions');

module.exports = {
  hello: Functions.https.onRequest((req, res) =>
    res.send('Hello'),
  ),
};
