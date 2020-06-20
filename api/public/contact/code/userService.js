const jwt = require('jsonwebtoken');
const moment = require('moment');
const dbService = require('./dbService');
const httpService = require('./httpService');

const issuer = 'https://api.contactz.com.au';
const JWT_TOKEN_EXPIRY_IN_SEC = 4 * 60 * 60; // 4h
const JWT_REFRESH_TOKEN_EXPIRY_IN_SEC = 14 * 24 * 60 * 60; // 14d
const algorithm = 'HS256';
const { JWT_SECRET } = process.env;

async function register(loginBody) {
  const username = loginBody.username;
  const existingUser = await getUserByUsername(username);
  if (existingUser) {
    throw new httpService.BadRequestError(`Username already exists: ${username}`);
  }
  await createUser(loginBody);
  return login(loginBody);
}

async function login(loginBody) {
  const user = await handleLogin(loginBody);
  console.log(`user=${JSON.stringify(user)}`);
  if (!user) {
    throw new httpService.BadRequestError(`Invalid login credentials`);
  }
  const claims = getClaims(user);
  console.log(`claims=${JSON.stringify(claims)}`);
  const token = jwt.sign(claims, JWT_SECRET, { algorithm });
  console.log(`token=${JSON.stringify(token)}`);
  let refreshToken = null;
  if (loginBody.refresh) {
    claims.exp = moment().unix() + JWT_REFRESH_TOKEN_EXPIRY_IN_SEC;
    refreshToken = jwt.sign(claims, JWT_SECRET, { algorithm });
    console.log(`refreshToken=${JSON.stringify(refreshToken)}`);
  }
  await updateUserToken(user, token, refreshToken);
  delete user.id;
  delete user.password;
  console.log(`user=${JSON.stringify(user)}`);
  return user;
}

async function logout(userUuid) {
  const user = await getUserByUuid(userUuid);
  if (!user) {
    throw new Error('Authorization failed. No user available in request');
  }
  await updateUserToken(user, null, null);
  console.log(`Logged out user=${userUuid}`);
  return { 'success': true };
}

async function refreshToken(headers) {
  const { refreshToken } = headers;
  let jwtPayload;
  try {
    jwtPayload = jwt.verify(refreshToken, JWT_SECRET, { algorithm });
  } catch (err) {
    throw new Error('Authorization failed. refreshToken is invalid. Please log in');
  }
  const userUuid = jwtPayload.sub;
  const user = await getUserByUuid(userUuid);
  if (!user) {
    throw new Error('Authorization failed. No user available in refreshToken');
  }
  jwtPayload.exp = moment().unix() + JWT_TOKEN_EXPIRY_IN_SEC;
  console.log(`claims=${JSON.stringify(jwtPayload)}`);
  const token = jwt.sign(jwtPayload, JWT_SECRET, { algorithm });
  console.log(`token=${JSON.stringify(token)}`);
  jwtPayload.exp = moment().unix() + JWT_REFRESH_TOKEN_EXPIRY_IN_SEC;
  const newRefreshToken = jwt.sign(jwtPayload, JWT_SECRET, { algorithm });
  console.log(`refreshToken=${JSON.stringify(newRefreshToken)}`);
  await updateUserToken(user, token, newRefreshToken);
  delete user.id;
  delete user.password;
  console.log(`user=${JSON.stringify(user)}`);
  return user;
}

async function updateUserToken(user, token, refreshToken) {
  user.token = token;
  user.refresh_token = refreshToken;
  const updateTokenSqlQuery = `update ${dbService.TABLE.USERS} set token = $1, refresh_token = $2 where id = $3`;
  const updateTokenValues = [token, refreshToken, user.id];
  await dbService.executeSqlQuery(updateTokenSqlQuery, updateTokenValues);
}

async function handleLogin({ username, password }) {
  const sqlQuery = `select id, uuid from ${dbService.TABLE.USERS} where username = $1 and password = md5($2)`;
  const values = [username, password];
  const result = await dbService.executeSqlQuery(sqlQuery, values);
  if (result.rowCount === 0) {
    return null;
  }
  return getUserByUsername(username);
}

async function createUser({ username, password }) {
  const sqlQuery = `insert into ${dbService.TABLE.USERS} (${dbService.COLUMN.CREATED_AT}, ${dbService.COLUMN.USERNAME}, ${dbService.COLUMN.PASSWORD}) VALUES (now(), $1, md5($2))`;
  const values = [username, password];
  return dbService.executeSqlQuery(sqlQuery, values);
}

async function getUserByUsername(username) {
  const sqlQuery = `select id, uuid, username, contact_id, token from ${dbService.TABLE.USERS} where username = $1`;
  const values = [username];
  const result = await dbService.executeSqlQuery(sqlQuery, values);
  if (result.rowCount === 0) {
    return null;
  }
  const user = result.rows[0];
  user.org = await getUserOrgAndRole(user.id);
  return user;
}

async function getUserByUuid(uuid) {
  const sqlQuery = `select id, uuid, username, contact_id from ${dbService.TABLE.USERS} where uuid = $1`;
  const values = [uuid];
  const result = await dbService.executeSqlQuery(sqlQuery, values);
  if (result.rowCount === 0) {
    return null;
  }
  const user = result.rows[0];
  user.org = await getUserOrgAndRole(user.id);
  return user;
}

async function getUserOrgAndRole(userId) {
  const sqlQuery = `select o.*, user_id, user_role from org o, org_user u where u.org_id=o.id and u.user_id = $1`;
  const values = [userId];
  const result = await dbService.executeSqlQuery(sqlQuery, values);
  if (result.rowCount === 0) {
    return undefined;
  }
  return result.rows[0]; // TODO: User could potentially have multiple organisations
}

function getClaims(user) {
  const claims = {
    issuer,
    sub: user.uuid,
    exp: moment().unix() + JWT_TOKEN_EXPIRY_IN_SEC,
  };
  if (user.org) {
    claims.aud = user.org.uuid;
    claims.role = user.org.user_role;
    claims.domain = user.org.domain;
  }
  return claims;
}

module.exports = { register, login, logout, refreshToken, getUserByUuid, getUserByUsername };