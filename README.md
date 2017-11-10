# firebase-functions

## Setup
1. Install [Node.js](https://nodejs.org/en/download/)
2. Create a project on [Firebase](https://console.firebase.google.com/) and note down the Project ID
3. Replace the project id in the `.firebaserc` with your Project ID

## Install
```
npm install
```

## Configure
```
npm run config:get
OPEN_WEATHER_MAP_KEY={KEY} npm run config:set
```

## Test
```
npm test
```

## Build
```
npm run build
npm run build:watch
```

## Start
```
npm start
npm run start:shell
```

## Deploy
```
npm run deploy
```

## Demo
https://us-central1-prototype-af43d.cloudfunctions.net/weather?city=Barcelona

## Presentation
https://docs.google.com/presentation/d/1AsdVp4h--GrEcTDTAi0praoS42e5YAvP5Pszy-_tdcw

## Learn More

[Firebase Cloud Functions](https://firebase.google.com/docs/functions/)

[Firebase Realtime Database](https://firebase.google.com/docs/database/)

[Firebase Cloud Firestore](https://firebase.google.com/docs/firestore/)
