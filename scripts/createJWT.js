var jwt = require('jsonwebtoken');
var dotenv = require('dotenv');
dotenv.config();

const currentTimeEpoch = Math.floor(Date.now() / 1000)
const hoursUntilExpiration = 24
const expiryTimeEpoch = currentTimeEpoch + (hoursUntilExpiration * 60 * 60)

const payload = {
  aud: process.env.AUDIENCE, // aud must be the same as the one in the chat api
  iss: process.env.ISSUER, // iss must be the same as the one in the chat api
  exp: expiryTimeEpoch, // Epoch time must be later than now
  sub: "123546789",
  entityUUID: "88c1d984-69bd-4926-906b-7023c070b434",
  userUUID: "eff2697a-8e9d-40ce-a461-f3fbc5739ace",
  levelOnEntity: 100
}

var token = jwt.sign(
  payload,
  process.env.JWT_MASTER_SECRET
);

console.log(token);