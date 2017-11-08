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
  // TEST: curl -H "Origin: http://hello.com" --verbose https://us-central1-prototype-af43d.cloudfunctions.net/hello1
  hello1: Functions.https.onRequest((req, res) =>
    res.send('Hello 1'),
  ),

  // TEST: curl -H "Origin: http://hello.com" --verbose https://us-central1-prototype-af43d.cloudfunctions.net/hello2
  hello2: Functions.https.onRequest((req, res) =>
    cors(req, res, () =>
      res.send('Hello 2'),
    ),
  ),


  // TEST: curl https://us-central1-prototype-af43d.cloudfunctions.net/date?format=DD-MM-YYYY%20HH:mm:ss
  date: Functions.https.onRequest((req, res) =>
    cors(req, res, () =>
      res.send(moment().format(req.query.format)),
    ),
  ),


  // 1

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

        const result = await request.get({
          url: `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&APPID=9760204cff9871ed6c7a40e530c83374`,
          json: true,
        });
        result.source = 'Open Weather Map';

        await Firebase.database().ref(`weather/${city}/results`)
          .push({ ...result, fetched: DATABASE_TIMESTAMP });

        await Firebase.firestore().collection('weather').doc(city).collection('results')
          .add({ ...result, fetched: FIRESTORE_TIMESTAMP });

        return res.status(200).send({ status: 200, result });
      } catch (err) {
        return res.status(500).send({ status: 500, error: err.message });
      }
    }),
  ),


  // 2

  databaseWeatherCityCreated: Functions.database.ref('weather/{city}').onCreate(event =>
    event.data.ref.update({ created: DATABASE_TIMESTAMP }),
  ),

  firestoreWeatherCityCreated: Functions.firestore.document('weather/{city}').onCreate(event =>
    event.data.ref.set({ created: FIRESTORE_TIMESTAMP }, { merge: true }),
  ),


  // 3

  databaseWeatherResultsCountIncrement: Functions.database.ref('weather/{city}/results/{result}').onCreate(event =>
    event.data.ref.parent.parent.child('count').transaction(count => (count || 0) + 1),
  ),

  firestoreWeatherResultsCountIncrement: Functions.firestore.document('weather/{city}/results/{result}').onCreate(event =>
    Firebase.firestore().runTransaction(async transaction => {
      const city = await transaction.get(event.data.ref.parent.parent);
      const count = (city.exists ? (city.data().count || 0) : 0) + 1;
      return transaction.set(event.data.ref.parent.parent, { count }, { merge: true });
    }),
  ),


  databaseWeatherResultsCountDecrement: Functions.database.ref('weather/{city}/results/{result}').onDelete(async event => {
    const city = await event.data.ref.parent.parent.once('value');
    if (city.exists()) {
      return event.data.ref.parent.parent.child('count').transaction(() => city.child('results').numChildren());
    }
  }),

  firestoreWeatherResultsCountDecrement: Functions.firestore.document('weather/{city}/results/{result}').onDelete(event =>
    Firebase.firestore().runTransaction(async transaction => {
      const city = await transaction.get(event.data.ref.parent.parent);
      if (city.exists) {
        const count = (await city.ref.collection('results').get()).size;
        return transaction.set(event.data.ref.parent.parent, { count }, { merge: true });
      }
    }),
  ),


  databaseWeatherResultsCountGuard: Functions.database.ref('weather/{city}/count').onDelete(async event => {
    const city = await event.data.ref.parent.once('value');
    if (city.exists()) {
      return event.data.ref.transaction(() => city.child('results').numChildren());
    }
  }),

  firestoreWeatherResultsCountGuard: Functions.firestore.document('weather/{city}').onUpdate(event => {
    if (event.data.previous.data().count !== undefined && event.data.data().count === undefined) {
      return Firebase.firestore().runTransaction(async transaction => {
        // TODO:
        const count = (await event.data.ref.firestore.collection('results').get()).size;
        return transaction.update(event.data.ref.parent.parent, { count });
      });
    }
  }),
};
