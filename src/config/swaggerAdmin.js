module.exports = function extend(spec) {
  const json = schema => ({ 'application/json': { schema } });
  const ref = name => ({ $ref: `#/components/schemas/${name}` });
  const auth = [{ bearerAuth: [] }];
  const id = { name: 'installationId', in: 'path', required: true, schema: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' } };
  const match = { name: 'If-Match', in: 'header', required: true, description: 'Exact strong ETag from installation GET. Wildcard and weak tags are rejected.', schema: { type: 'string' } };
  const err = description => ({ description, content: json(ref('Error')) });
  const errors = { 400: err('Invalid input'), 401: err('Authentication required'), 403: err('Administration permission missing or jurisdiction forbidden'), 404: err('Resource absent or deleted'), 409: err('Duplicate resource'), 412: err('Stale validator or concurrent update'), 428: err('If-Match missing') };
  const adminScope = 'Requires separately provisioned installation administration permission. NATIONAL administrators can manage all jurisdictions; PROVINCE and DISTRICT administrators can manage only their assigned jurisdiction. Creation and reassignment also check the destination substation. Ordinary users cannot write.';
  const properties = { meterId: { type: 'string', maxLength: 100 }, inverterId: { type: 'string', maxLength: 100 }, substation: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' }, capacityKw: { type: 'number', minimum: 0, exclusiveMinimum: true }, latitude: { type: 'number', minimum: -90, maximum: 90 }, longitude: { type: 'number', minimum: -180, maximum: 180 }, status: { type: 'string', enum: ['ACTIVE','INACTIVE','MAINTENANCE'] } };
  spec.components.schemas.InstallationInput = { type: 'object', additionalProperties: false, required: ['meterId','substation','capacityKw','status'], properties };
  spec.components.schemas.InstallationPatch = { type: 'object', additionalProperties: false, minProperties: 1, properties };
  spec.components.schemas.Installation.properties.revision = { type: 'integer', minimum: 0, readOnly: true };
  const success = { description: 'Installation representation', content: json(ref('Installation')), headers: { ETag: { schema: { type: 'string' } } } };
  spec.paths['/api/v1/installations'] = { post: { tags: ['Installation Administration'], summary: 'Create installation', security: auth,
    description: adminScope,
    requestBody: { required: true, content: json(ref('InstallationInput')) }, responses: { 201: { ...success, headers: { ...success.headers, Location: { schema: { type: 'string' } } } }, ...errors } } };
  const route = spec.paths['/api/v1/installations/{installationId}'];
  for (const method of ['put','patch','delete']) {
    route[method] = { tags: ['Installation Administration'], summary: `${method.toUpperCase()} installation`, security: auth, parameters: [id, match],
      description: adminScope + ' ' + (method === 'delete' ? 'Soft delete: subsequent public reads and device exchange/ingestion return not found or invalid credentials; history is retained internally. Repeated DELETE returns 404. Meter ID remains reserved.' : method === 'put' ? 'Replace all writable metadata. Omitted optional fields are removed; server metadata and credentials remain. No upsert.' : 'Partially update supplied writable metadata.'),
      ...(method === 'delete' ? {} : { requestBody: { required: true, content: json(ref(method === 'put' ? 'InstallationInput' : 'InstallationPatch')) } }),
      responses: { ...(method === 'delete' ? { 204: { description: 'Deleted; empty body' } } : { 200: success }), ...errors } };
  }
  spec.paths['/api/v1/installations/{installationId}/device-credentials'] = { post: { tags: ['Installation Administration'], security: auth, parameters: [id], summary: 'Provision or rotate device credential',
    description: adminScope + ' Returns a generated secret once. Existing access tokens remain valid until expiry; deleted installations reject writes.', responses: { 201: { description: 'Store apiKey securely; never publish it', content: json({ type: 'object', properties: { installationId: { type: 'string' }, meterId: { type: 'string' }, apiKey: { type: 'string' }, message: { type: 'string' } } }) }, ...errors } } };
  spec.paths['/api/v1/auth/device-token'] = { post: { tags: ['Authentication'], summary: 'Exchange device credential for installation-scoped JWT', security: [], requestBody: { required: true, content: json({ type: 'object', additionalProperties: false, required: ['meterId','apiKey'], properties: { meterId: { type: 'string' }, apiKey: { type: 'string', minLength: 32, maxLength: 128 } } }) }, responses: { 200: { description: 'Device access token', content: json({ type: 'object', properties: { accessToken: { type: 'string' }, tokenType: { type: 'string' }, expiresIn: { type: 'string' }, installationId: { type: 'string' } } }) }, 400: errors[400], 401: err('Invalid device credentials'), 429: err('Too many authentication attempts') } } };
  spec.components.schemas.SubstationLocationPatch = { type: 'object', additionalProperties: false, minProperties: 1, properties: {
    district: { type: 'string', pattern: '^[a-fA-F0-9]{24}$', description: 'Existing destination district.' },
    latitude: { type: 'number', minimum: -90, maximum: 90 },
    longitude: { type: 'number', minimum: -180, maximum: 180 },
  } };
  spec.paths['/api/v1/substations/{substationId}'].patch = {
    tags: ['Grid Substations'], summary: 'Update a substation location', security: auth,
    description: 'Requires a provisioned NATIONAL installation administrator. Changing district moves the substation and its linked installations into the destination jurisdiction without deleting or reassigning installation records. Send the current ETag from GET in If-Match; no upsert.',
    parameters: [
      { name: 'substationId', in: 'path', required: true, schema: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' } },
      { name: 'If-Match', in: 'header', required: true, description: 'Exact strong ETag from substation GET. Wildcard and weak tags are rejected.', schema: { type: 'string' } },
    ],
    requestBody: { required: true, content: json(ref('SubstationLocationPatch')) },
    responses: {
      200: { description: 'Updated substation', content: json(ref('Substation')), headers: { ETag: { schema: { type: 'string' } } } },
      400: errors[400], 401: errors[401], 403: err('National administrator permission required'),
      404: err('Substation or destination district absent'), 412: errors[412], 428: errors[428],
    },
  };
  spec.components.schemas.LatestReading = { type: 'object', properties: { installationId: { type: 'string' }, reading: ref('Reading'), observedAt: { type: 'string', format: 'date-time' }, ageSeconds: { type: 'integer' }, isStale: { type: 'boolean' }, freshnessThresholdSeconds: { type: 'integer', example: 1800 } } };
  const latest = spec.paths['/api/v1/installations/{installationId}/latest-reading'].get;
  latest.responses[200].content = json(ref('LatestReading'));
  latest.description = 'Derived operational view. Negative age indicates a future event and is considered stale. The ETag includes the evaluation time, so normally changes on each request. Use atomic reading endpoints for stable conditional GET. No Last-Modified is claimed for clock-derived fields.';
  spec.paths['/api/v1/provinces/{provinceId}/districts'].get.description = 'District users see only their own district under their parent province; other provinces are forbidden.';
  spec.tags.push({ name: 'Installation Administration' });
  return spec;
};
