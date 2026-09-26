const mongoose = require('mongoose');

if (!process.env.MONGODB_URI) {
  console.warn(
    'WARNING: MONGODB_URI is not set. The API will fail to connect.\n' +
    'Set it in your .env file (see .env.example) or in your host\'s env vars.'
  );
}

async function connect() {
  mongoose.set('strictQuery', true);
  await mongoose.connect(process.env.MONGODB_URI, {
    // modern mongoose (7/8) doesn't need useNewUrlParser/useUnifiedTopology,
    // kept here as a comment in case you're on an older mongoose version:
    // useNewUrlParser: true,
    // useUnifiedTopology: true,
  });
  console.log('Connected to MongoDB');
}

module.exports = { connect, mongoose };
