/* */


const Firebase = require('firebase-admin');
const Functions = require('firebase-functions');

const cors = require('cors')({ origin: true });
const request = require('request-promise-native');


/* ********* INIT ********* */


Firebase.initializeApp(Functions.config().firebase);

const DATABASE_TIMESTAMP = Firebase.database.ServerValue.TIMESTAMP;
const FIRESTORE_TIMESTAMP = Firebase.firestore.FieldValue.serverTimestamp();


/* ********* FUNCTIONS ********* */


module.exports = {
  // curl -H "Origin: http://test.com" --verbose https://us-central1-prototype-af43d.cloudfunctions.net/hello1
  hello1: Functions.https.onRequest((req, res) =>
    res.send('Hello 1'),
  ),

  // curl -H "Origin: http://test.com" --verbose https://us-central1-prototype-af43d.cloudfunctions.net/hello2
  hello2: Functions.https.onRequest((req, res) =>
    cors(req, res, () =>
      res.send('Hello 2'),
    ),
  ),

  // curl -H "Origin: http://test.com" --verbose https://us-central1-prototype-af43d.cloudfunctions.net/hello3?text=World
  hello3: Functions.https.onRequest((req, res) =>
    cors(req, res, () =>
      res.send({ message: `Hello ${req.query.text || '3'}` }),
    ),
  ),


  // 1

  // curl -X POST https://us-central1-prototype-af43d.cloudfunctions.net/weather
  // curl https://us-central1-prototype-af43d.cloudfunctions.net/weather
  // curl https://us-central1-prototype-af43d.cloudfunctions.net/weather?city=Barcelona
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
          url: `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&APPID=${Functions.config().openweathermap.key}`,
          json: true,
        });
        result.source = 'Open Weather Map';

        await Firebase.database().ref(`weather/${city}/results`).push({ ...result, fetched: DATABASE_TIMESTAMP });
        await Firebase.firestore().collection('weather').doc(city).collection('results').add({ ...result, fetched: FIRESTORE_TIMESTAMP });

        return res.status(200).send({ status: 200, result });
      } catch (error) {
        return res.status(500).send({ status: 500, error: error.message });
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
      return transaction.set(city.ref, { count }, { merge: true });
    }),
  ),


  databaseWeatherResultsCountDecrement: Functions.database.ref('weather/{city}/results/{result}').onDelete(async event => {
    const city = await event.data.ref.parent.parent.once('value');
    if (city.exists()) {
      return city.ref.child('count').transaction(() => city.child('results').numChildren());
    }
  }),

  firestoreWeatherResultsCountDecrement: Functions.firestore.document('weather/{city}/results/{result}').onDelete(event =>
    Firebase.firestore().runTransaction(async transaction => {
      const city = await transaction.get(event.data.ref.parent.parent);
      if (city.exists) {
        const count = (await transaction.get(city.ref.collection('results'))).size;
        return transaction.set(city.ref, { count }, { merge: true });
      }
    }),
  ),


  databaseWeatherResultsCountGuard: Functions.database.ref('weather/{city}/count').onDelete(async event => {
    const city = await event.data.ref.parent.once('value');
    if (city.exists()) {
      return city.ref.child('count').transaction(() => city.child('results').numChildren());
    }
  }),

  firestoreWeatherResultsCountGuard: Functions.firestore.document('weather/{city}').onUpdate(event => {
    if (event.data.previous.data().count !== undefined && event.data.data().count === undefined) {
      return Firebase.firestore().runTransaction(async transaction => {
        const count = (await transaction.get(event.data.ref.collection('results'))).size;
        return transaction.update(event.data.ref, { count });
      });
    }
  }),
};
