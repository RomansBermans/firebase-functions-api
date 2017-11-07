/* */


const Firebase = require('firebase-admin');
const Functions = require('firebase-functions');

const cors = require('cors')({ origin: true });
const moment = require('moment');
const request = require('request-promise-native');


/* ********* INIT ********* */


Firebase.initializeApp(Functions.config().firebase);

const DATABASE_TIMESTAMP = Firebase.database.ServerValue.TIMESTAMP;
const FIRESTORE_TIMESTAMP = Firebase.firestore.FieldValue.serverTimestamp();


/* ********* FUNCTIONS ********* */


module.exports = {
  // TEST: curl -H "Origin: http://hello.com" --verbose https://us-central1-prototype-af43d.cloudfunctions.net/hello_1
  hello_1: Functions.https.onRequest((req, res) =>
    res.send('Hello World!'),
  ),

  // TEST: curl -H "Origin: http://hello.com" --verbose https://us-central1-prototype-af43d.cloudfunctions.net/hello_2
  hello_2: Functions.https.onRequest((req, res) =>
    cors(req, res, async () =>
      res.send('Hello World!'),
    ),
  ),


  // TEST: curl https://us-central1-prototype-af43d.cloudfunctions.net/date?format=MMMM Do YYYY h mm ss a
  date: Functions.https.onRequest((req, res) =>
    cors(req, res, () =>
      res.send(moment().format(req.query.format)),
    ),
  ),


  // TEST: curl https://us-central1-prototype-af43d.cloudfunctions.net/weather?city=Barcelona
  // TEST: curl -X POST https://us-central1-prototype-af43d.cloudfunctions.net/weather?city=Barcelona
  weather: Functions.https.onRequest((req, res) =>
    cors(req, res, async () => {
      try {
        if (req.method !== 'GET') {
          return res.status(405).send({ status: 405, error: 'Request method not supported.' });
        }

        const { city } = req.query;
        if (!city) {
          return res.status(400).send({ status: 400, error: 'Missing query parameter \'city\'.' });
        }

        let result = await request.get({
          url: `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&APPID=9760204cff9871ed6c7a40e530c83374`,
          json: true,
        });
        result = { ...result, _source: 'Open Weather Map' };

        await Firebase.database().ref(`weather/${city}/results`).push(result);
        await Firebase.firestore().collection('weather').doc(city).collection('results').add(result);

        return res.status(200).send({ status: 200, result });
      } catch (err) {
        return res.status(500).send({ status: 500, error: err.message });
      }
    }),
  ),

  database_weather_city: Functions.database.ref('weather/{city}').onCreate(event =>
    event.data.ref.update({ _created: DATABASE_TIMESTAMP }),
  ),
  database_weather_city_results_result: Functions.database.ref('weather/{city}/results/{result}').onCreate(event =>
    event.data.ref.update({ _created: DATABASE_TIMESTAMP }),
  ),

  firestore_weather_city: Functions.firestore.document('weather/{city}').onCreate(event =>
    event.data.ref.update({ _created: FIRESTORE_TIMESTAMP }),
  ),
  firestore_weather_city_results_result: Functions.firestore.document('weather/{city}/results/{result}').onCreate(event =>
    event.data.ref.update({ _created: FIRESTORE_TIMESTAMP }),
  ),
};
