const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
const id = { type: 'string', pattern: '^[a-fA-F0-9]{24}$', example: '507f1f77bcf86cd799439011' };
const dateTime = { type: 'string', format: 'date-time' };
const parameter = (name, schema, description) => ({ name, in: 'query', schema, description });
const paging = [parameter('page', { type: 'integer', minimum: 1, maximum: 1000000, default: 1 }), parameter('pageSize', { type: 'integer', minimum: 1, maximum: 100, default: 50 })];
const time = [parameter('from', dateTime, 'Inclusive UTC timestamp, e.g. 2026-09-06T00:00:00Z.'), parameter('to', dateTime, 'Inclusive UTC timestamp.')];
const history = [...paging, ...time, parameter('sort', { type: 'string', enum: ['timestamp:asc', 'timestamp:desc'], default: 'timestamp:desc' })];
const response = (description, schema) => ({ description, content: { 'application/json': { schema } } });
const error = (description) => response(description, ref('Error'));
const errors = { 400: error('Invalid identifier, query or body'), 401: error('Missing, invalid or expired token'), 403: error('Wrong token type or jurisdiction'), 404: error('Resource not found'), 406: error('Requested representation is not supported'), 500: error('Unexpected server error') };
const schemas = {
  Error: { type: 'object', required: ['code', 'message', 'path'], properties: { code: { type: 'string', example: 'VALIDATION_ERROR' }, message: { type: 'string' }, details: { nullable: true }, timestamp: dateTime, path: { type: 'string' } } },
  Province: { type: 'object', properties: { _id: id, name: { type: 'string', example: 'Western' }, code: { type: 'string', example: 'WP' }, createdAt: dateTime, updatedAt: dateTime } },
  District: { type: 'object', properties: { _id: id, name: { type: 'string', example: 'Gampaha' }, code: { type: 'string', example: 'GA' }, province: id, createdAt: dateTime, updatedAt: dateTime } },
  Substation: { type: 'object', properties: { _id: id, name: { type: 'string' }, code: { type: 'string' }, district: id, latitude: { type: 'number' }, longitude: { type: 'number' }, createdAt: dateTime, updatedAt: dateTime } },
  Installation: { type: 'object', properties: { _id: id, meterId: { type: 'string' }, inverterId: { type: 'string' }, substation: id, capacityKw: { type: 'number' }, latitude: { type: 'number' }, longitude: { type: 'number' }, status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'MAINTENANCE'] }, createdAt: dateTime, updatedAt: dateTime } },
  ReadingInput: { type: 'object', additionalProperties: false, required: ['timestamp', 'powerKw', 'energyKwh', 'voltage'], properties: { timestamp: dateTime, powerKw: { type: 'number', minimum: 0 }, energyKwh: { type: 'number', minimum: 0, description: 'Cumulative meter-lifetime energy, not interval energy.' }, voltage: { type: 'number', minimum: 0 } }, example: { timestamp: '2026-09-17T06:30:00Z', powerKw: 3.4, energyKwh: 1400.2, voltage: 230 } },
  Reading: { type: 'object', properties: { _id: id, installation: id, timestamp: dateTime, powerKw: { type: 'number' }, energyKwh: { type: 'number' }, voltage: { type: 'number' }, createdAt: dateTime, updatedAt: dateTime } },
  CreatedReading: { type: 'object', properties: { id, installationId: id, timestamp: dateTime, powerKw: { type: 'number' }, energyKwh: { type: 'number' }, voltage: { type: 'number' } } },
  Overview: { type: 'object', properties: { installation: ref('Installation'), location: { type: 'object', properties: { substation: { type: 'string', nullable: true }, district: { type: 'string', nullable: true }, province: { type: 'string', nullable: true } } }, latestReading: { allOf: [ref('Reading')], nullable: true } } },
  Summary: { type: 'object', properties: Object.fromEntries([
    ['districtId', id], ['districtName', { type: 'string' }], ['date', { type: 'string', format: 'date' }], ['timezone', { type: 'string', example: 'Asia/Colombo' }],
    ...['installationCount', 'activeInstallations', 'freshInstallationCount', 'missingOrStaleInstallations', 'energyCoveredInstallations', 'energyResetInstallations'].map((name) => [name, { type: 'integer' }]),
    ...['currentPowerKw', 'todayEnergyKwh'].map((name) => [name, { type: 'number' }]), ['latestReadingAt', { ...dateTime, nullable: true }], ['energyMethod', { type: 'string' }],
  ]) },
};
function collection(name, paged = false) {
  return { type: 'object', properties: { data: { type: 'array', items: ref(name) }, ...(paged ? {
    pagination: { type: 'object', properties: Object.fromEntries(['page', 'pageSize', 'totalCount', 'totalPages'].map((key) => [key, { type: 'integer' }])) },
    links: { type: 'object', properties: Object.fromEntries(['self', 'next', 'previous'].map((key) => [key, { type: 'string', nullable: true }])) },
  } : {}) } };
}
const paths = {};
function get(path, summary, tag, schema, parameters = [], description = '') {
  const pathParameters = [...path.matchAll(/\{(\w+)\}/g)].map((match) => ({ name: match[1], in: 'path', required: true, schema: id }));
  paths[path] = { get: { summary, description, tags: [tag], security: [{ bearerAuth: [] }], parameters: [...pathParameters, ...parameters, { name: 'If-None-Match', in: 'header', schema: { type: 'string' }, description: 'ETag from a previous response; match returns an empty 304.' }], responses: {
    200: { ...response('Successful response', schema), headers: { ETag: { schema: { type: 'string' } }, 'Last-Modified': { schema: { type: 'string' }, description: 'Present on atomic records with updatedAt; use ETag for collections and derived resources.' }, 'Cache-Control': { schema: { type: 'string' } } } },
    304: { description: 'Representation unchanged; no response body' }, ...errors,
  } } };
}
get('/api/v1/provinces', 'List accessible provinces', 'Provinces', collection('Province'));
get('/api/v1/provinces/{provinceId}', 'Get a province', 'Provinces', ref('Province'));
get('/api/v1/provinces/{provinceId}/districts', 'List districts in a province', 'Districts', collection('District'), [], 'National or matching province users. District users access their district directly.');
get('/api/v1/districts/{districtId}', 'Get a district', 'Districts', ref('District'));
get('/api/v1/districts/{districtId}/substations', 'List district substations', 'Grid Substations', collection('Substation'));
get('/api/v1/substations/{substationId}', 'Get a substation', 'Grid Substations', ref('Substation'));
get('/api/v1/substations/{substationId}/installations', 'List substation installations', 'Solar Installations', collection('Installation', true), [...paging, parameter('status', { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'MAINTENANCE'] })]);
get('/api/v1/installations/{installationId}', 'Get an installation', 'Solar Installations', ref('Installation'));
get('/api/v1/installations/{installationId}/overview', 'Installation and location with latest reading', 'Solar Installations', ref('Overview'));
get('/api/v1/installations/{installationId}/latest-reading', 'Latest recorded measurement', 'Generation Readings', ref('Reading'), [], 'Latest by event timestamp, which may be historical; 404 when no reading exists.');
get('/api/v1/installations/{installationId}/readings', 'Historical readings', 'Generation Readings', collection('Reading', true), history);
get('/api/v1/installations/{installationId}/readings/{readingId}', 'Get an individual reading', 'Generation Readings', ref('Reading'));
get('/api/v1/readings', 'Search readings within your jurisdiction', 'Analytics', collection('Reading', true), [...history, ...['provinceId', 'districtId', 'substationId', 'installationId'].map((name) => parameter(name, id))], 'Filters intersect; conflicting hierarchy filters yield an empty page. Explicit out-of-scope filters return 403. Equal timestamps are ordered by reading ID.');
get('/api/v1/districts/{districtId}/generation-summary', 'District generation summary', 'Analytics', ref('Summary'), [parameter('date', { type: 'string', format: 'date' }, 'Sri Lankan calendar date, defaults to today; future dates rejected.')], 'Power sums the latest same-day reading per installation only when at most 30 minutes old relative to now (today) or day end (historical). Energy sums last minus first observed cumulative energy per installation in that day; series with a decrease are excluded. Missing coverage is reported. Historical active count uses current installation status.');
paths['/api/v1/installations/{installationId}/readings'].post = {
  tags: ['Generation Readings'], summary: 'Append a device measurement', security: [{ deviceAuth: [] }],
  parameters: [{ name: 'installationId', in: 'path', required: true, schema: id }],
  requestBody: { required: true, content: { 'application/json': { schema: ref('ReadingInput') } } },
  responses: { 201: { ...response('Reading created', ref('CreatedReading')), headers: { Location: { schema: { type: 'string' }, description: 'Individual reading URL; retrieve it with a user token.' } } }, ...errors, 409: error('Duplicate installation and timestamp'), 415: error('JSON request body required') },
};
paths['/api/v1/auth/login'] = { post: { tags: ['Authentication'], summary: 'Log in as an SLSEA user', security: [],
  requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['email', 'password'], additionalProperties: false, properties: { email: { type: 'string', format: 'email' }, password: { type: 'string', format: 'password' } } } } } },
  responses: { 200: response('User token; do not capture or share it in evidence', { type: 'object', properties: { accessToken: { type: 'string' }, tokenType: { type: 'string' }, expiresIn: { type: 'string' }, user: { type: 'object', properties: { id, name: { type: 'string' }, email: { type: 'string' }, role: { type: 'string' } } } } }), ...errors, 415: error('JSON body required') },
} };
for (const [path, description] of [['/health', 'Process liveness'], ['/ready', 'Database readiness']]) paths[path] = { get: { tags: ['Operations'], summary: description, security: [], responses: { 200: response('Healthy', { type: 'object', properties: { status: { type: 'string' }, database: { type: 'string' }, timestamp: dateTime } }), ...(path === '/ready' ? { 503: response('Database unavailable', { type: 'object' }) } : {}) } } };

module.exports = { openapi: '3.0.3', info: { title: 'SLSEA Solar Generation API', version: '1.0.0', description: 'Coursework API with synthetic solar data. Log in, then use Authorize with the user token for reads. Device tokens are provisioned locally and only permit reading uploads. Readings are append-only. All quantities use kW, kWh and volts.' }, servers: [{ url: '/' }], tags: ['Authentication', 'Provinces', 'Districts', 'Grid Substations', 'Solar Installations', 'Generation Readings', 'Analytics', 'Operations'].map((name) => ({ name })), paths,
  components: { schemas, securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'SLSEA user token from login' }, deviceAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'Installation-scoped device token from the provisioning command' } } } };
