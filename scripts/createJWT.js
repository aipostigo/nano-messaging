const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
dotenv.config();

// Input token on script
if (!process.argv[2]) {
  console.log('No UUID provided');
  console.log('node createJWT.js <UUID>');
  process.exit(1);
}

const UUID = process.argv[2];
const defaultOrganization = '9bc91a48-f27f-4df3-b1d7-136ce4f7a5dd';

const currentTimeEpoch = Math.floor(Date.now() / 1000)
const hoursUntilExpiration = 24
const expiryTimeEpoch = currentTimeEpoch + (hoursUntilExpiration * 60 * 60)

const payload = {
  aud: process.env.AUDIENCE, // aud must be the same as the one in the chat api
  iss: process.env.ISSUER, // iss must be the same as the one in the chat api
  exp: expiryTimeEpoch, // Epoch time must be later than now
  sub: UUID,
  entityUUID: defaultOrganization,
  userUUID: UUID,
  levelOnEntity: 999
}

const token = jwt.sign(
  payload,
  process.env.JWT_MASTER_SECRET
);

console.log(`\nBearer token:\n${token}`);