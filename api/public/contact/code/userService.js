const jwt = require('jsonwebtoken');
const moment = require('moment');
const md5 = require('md5');
const crudService = require('./crudService');
const httpService = require('./httpService');
const logService = require('./logService');

const issuer = 'https://api.contactz.com.au';
const TABLE_NAME = 'user';
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
  logService.debug('user', user);
  if (!user) {
    throw new httpService.BadRequestError(`Invalid login credentials`);
  }
  const claims = getClaims(user);
  logService.debug('claims', claims);
  const token = jwt.sign(claims, JWT_SECRET, { algorithm });
  logService.debug('token', token);
  let refreshToken = null;
  if (loginBody.refresh) {
    claims.exp = moment().unix() + JWT_REFRESH_TOKEN_EXPIRY_IN_SEC;
    refreshToken = jwt.sign(claims, JWT_SECRET, { algorithm });
    logService.debug('refreshToken', refreshToken);
  }
  await updateUserToken(user, token, refreshToken);
  delete user.password;
  logService.debug('user', user);
  return user;
}

async function logout(username) {
  const user = await getUserByUsername(username);
  if (!user) {
    throw new Error('Authorization failed. No user available in request');
  }
  await updateUserToken(user, null, null);
  logService.info(`Logged out user=${userUuid}`);
  return { success: true };
}

async function refreshToken(headers) {
  const { refreshToken: md5refreshToken } = headers;
  let jwtPayload;
  try {
    const refreshToken = await findUserTokenByRefreshToken(md5refreshToken);
    if (!refreshToken) {
      throw new Error('Authorization failed. refreshToken is invalid. Please log in');
    }
    jwtPayload = jwt.verify(refreshToken, JWT_SECRET, { algorithm });
  } catch (err) {
    throw new Error('Authorization failed. refreshToken is invalid. Please log in');
  }
  const username = jwtPayload.sub;
  const user = await getUserByUsername(username);
  if (!user) {
    throw new Error('Authorization failed. No user available in refreshToken');
  }
  jwtPayload.exp = moment().unix() + JWT_TOKEN_EXPIRY_IN_SEC;
  logService.debug('claims', jwtPayload);
  const token = jwt.sign(jwtPayload, JWT_SECRET, { algorithm });
  logService.debug('token', token);
  jwtPayload.exp = moment().unix() + JWT_REFRESH_TOKEN_EXPIRY_IN_SEC;
  const newRefreshToken = jwt.sign(jwtPayload, JWT_SECRET, { algorithm });
  logService.debug('refreshToken', refreshToken);
  await updateUserToken(user, token, newRefreshToken);
  delete user.id;
  delete user.password;
  logService.debug('user', user);
  return user;
}

async function updateUserToken(user, token, refreshToken) {
  user.token = token;
  user.refresh_token = refreshToken && md5(refreshToken);
  crudService.crud.update({ tableName: TABLE_NAME, userId: user.pk, id: user.sk, body: user });
}

async function findUserTokenByRefreshToken(refreshToken) {
  const sqlQuery = `select refresh_token from ${dbService.TABLE.USERS} where md5(refresh_token) = $1`;
  const values = [refreshToken];
  const result = await dbService.executeSqlQuery(sqlQuery, values);
  // crudService.crud.read({ tableName: TABLE_NAME, userId: user.pk, id: user.sk, body: user });
  if (result.rowCount > 0) {
    return result.rows[0]['refresh_token'];
  }
}

async function handleLogin({ username, password }) {
  return crudService.crud.read({ tableName: TABLE_NAME, userId: username, id: md5(password) });
}

function sanitiseResult(result) {
  if (!result) {
    return null;
  }
  delete result.sk;
  delete result.id;
  delete result.password;
  return result;
}

async function createUser({ username, password, organisation }) {
  const body = {
    created_at: new Date().toISOString(),
    name: username,
    organisation,
  };
  const result = await crudService.crud.create({ tableName: TABLE_NAME, userId: username, id: md5(password), body });
  return sanitiseResult(result);
}

async function getUserByUsername(username) {
  const result = await crudService.crud.read({ tableName: TABLE_NAME, userId: username });
  return sanitiseResult(result);
}

function getClaims(user) {
  const claims = {
    issuer,
    sub: user.username,
    exp: moment().unix() + JWT_TOKEN_EXPIRY_IN_SEC,
  };
  if (user.org) {
    claims.aud = user.org.uuid;
    claims.role = user.org.user_role;
    claims.domain = user.org.domain;
  }
  return claims;
}

module.exports = { register, login, logout, refreshToken, getUserByUsername };
