const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();

const currentTimeEpoch = Math.floor(Date.now() / 1000)
const hoursUntilExpiration = 24
const expiryTimeEpoch = currentTimeEpoch + (hoursUntilExpiration * 60 * 60)

const payload = {
  aud: process.env.AUDIENCE, // aud must be the same as the one in the chat api
  iss: process.env.ISSUER, // iss must be the same as the one in the chat api
  exp: expiryTimeEpoch, // Epoch time must be later than now
  sub: "88c1d984-69bd-4926-906b-7023c070b434",
  entityUUID: "88c1d984-69bd-4926-906b-7023c070b434",
  userUUID: "88c1d984-69bd-4926-906b-7023c070b434",
  levelOnEntity: 999
}

const token = jwt.sign(
  payload,
  process.env.JWT_MASTER_SECRET
);

console.log(token);