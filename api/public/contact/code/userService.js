const jwt = require('jsonwebtoken');
const dbService = require('./dbService');
const constants = require('./constants');
const httpService = require('./httpService');
const httpStatus = constants.HTTP_STATUS;

const issuer = 'https://api.contactz.com.au';
const exp = '4h';
const algorithm = 'HS256';
const { JWT_SECRET } = process.env;

async function register(loginBody) {
  const username = loginBody.username;
  const existingUser = await getUserByUsername(username);
  if (existingUser) {
    throw new httpService.BadRequestError(`Username already exists: ${username}`, httpStatus.BAD_REQUEST);
  }
  await createUser(loginBody);
  return login(loginBody);
}

async function login(loginBody) {
  const user = await handleLogin(loginBody);
  if (!user) {
    throw new httpService.BadRequestError(`Invalid login credentials`, httpStatus.BAD_REQUEST);
  }
  const claims = getClaims(user);
  const token = jwt.sign(claims, JWT_SECRET, { algorithm });
  await updateUserToken(user, token);
  delete user.id;
  delete user.password;
  return user;
}

async function updateUserToken(user, token) {
  user.token = token;
  const updateTokenSqlQuery = `update ${dbService.TABLE.USER} set token = $1 where id = $2`;
  const updateTokenValues = [token, user.id];
  await dbService.executeSqlQuery(updateTokenSqlQuery, updateTokenValues);
}

async function handleLogin({ username, password }) {
  const sqlQuery = `select id, uuid, token from ${dbService.TABLE.USER} where username = $1 and $password = md5($2)`;
  const values = [username, password];
  const result = await dbService.executeSqlQuery(sqlQuery, values);
  if (!result || !result.rows || result.rows.length === 0) {
    return null;
  }
  return getUserByUsername(username);
}

async function createUser({ username, password }) {
  const sqlQuery = `insert into ${dbService.TABLE.USER} (${dbService.COLUMN.CREATED_AT}, ${dbService.COLUMN.USERNAME}, ${dbService.COLUMN.PASSWORD}) VALUES (now(), $1, md5($2))`;
  const values = [username, password];
  return dbService.executeSqlQuery(sqlQuery, values);
}

async function getUserByUsername(username) {
  const sqlQuery = `select id, uuid, username, contact_id, token from ${dbService.TABLE.USER} where username = $1`;
  const values = [username];
  const result = await dbService.executeSqlQuery(sqlQuery, values);
  if (!result || !result.rows || result.rows.length === 0) {
    return null;
  }
  const user = result.rows[0];
  user.account = await getUserAccountAndRole(user.id);
  return user;
}

async function getUserAccountAndRole(userId) {
  const sqlQuery = `select a.*, user_id, user_role from account a, account_user u where u.account_id=a.id and u.user_id = $1`;
  const values = [userId];
  const result = await dbService.executeSqlQuery(sqlQuery, values);
  if (!result || !result.rows || result.rows.length === 0) {
    return undefined;
  }
  return result.rows[0]; // TODO: User could potentially have multiple accounts
}

function getClaims(user) {
  const claims = {
    issuer,
    sub: user.uuid,
    exp,
  };
  if (user.account) {
    claims.aud = {
      account: {
        uuid: account.uuid,
        role: account.role,
        domain: account.domain,
      }
    }
  }
  return claims;
}

module.exports = { register, login };