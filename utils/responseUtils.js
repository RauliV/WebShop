const basicAuthChallenge = response => {
  // TODO: 8.5 Send proper basic authentication challenge headers. 
  // See:
  // https://developer.mozilla.org/en-US/docs/Web/HTTP/Authentication#the_general_http_authentication_framework
  // The first step of the challenge and response flow  as described on the webpage is done here. 
  response.writeHead(401, {'www-authenticate': 'Basic'});
  return response.end();
};

const sendJson = (response, payload, code = 200) => {
  response.writeHead(code, { 'Content-Type': 'application/json' });
  return response.end(JSON.stringify(payload));
};

const createdResource = (response, payload) => {
  return sendJson(response, payload, 201);
};

const noContent = response => {
  response.statusCode = 204;
  return response.end();
};

const badRequest = (response, errorMsg) => {
  if (errorMsg) return sendJson(response, { error: errorMsg }, 400);

  response.statusCode = 400;
  return response.end();
};

const unauthorized = response => {
  response.statusCode = 401;
  return response.end();
};

const forbidden = response => {
  response.statusCode = 403;
  return response.end();
};

const notFound = response => {
  response.statusCode = 404;
  return response.end();
};

const methodNotAllowed = response => {
  response.statusCode = 405;
  return response.end();
};

const contentTypeNotAcceptable = response => {
  response.statusCode = 406;
  return response.end();
};

const internalServerError = response => {
  response.statusCode = 500;
  return response.end();
};

const redirectToPage = (response, page) => {
  response.writeHead(302, { Location: page });
  response.end();
};

module.exports = {
  sendJson,
  createdResource,
  noContent,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  methodNotAllowed,
  contentTypeNotAcceptable,
  internalServerError,
  basicAuthChallenge,
  redirectToPage
};