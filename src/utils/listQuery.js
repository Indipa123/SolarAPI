const ApiError = require('./ApiError');

function invalid(field) {
  throw new ApiError(400, 'VALIDATION_ERROR', `Invalid ${field} query parameter.`, { field });
}

function parseListQuery(query, { readings = false } = {}) {
  const allowed = readings ? ['page', 'pageSize', 'sort', 'from', 'to'] : ['page', 'pageSize', 'status'];
  for (const key of Object.keys(query)) if (!allowed.includes(key)) invalid(key);
  const integer = (key, fallback, max) => {
    if (query[key] === undefined) return fallback;
    if (typeof query[key] !== 'string' || !/^[1-9]\d*$/.test(query[key])) invalid(key);
    const value = Number(query[key]);
    if (!Number.isSafeInteger(value) || value > max) invalid(key);
    return value;
  };
  const result = { page: integer('page', 1, 1000000), pageSize: integer('pageSize', 50, 100) };
  if (!readings) {
    if (query.status !== undefined && !['ACTIVE', 'INACTIVE', 'MAINTENANCE'].includes(query.status)) invalid('status');
    if (query.status) result.status = query.status;
    return result;
  }
  if (query.sort !== undefined && !['timestamp:asc', 'timestamp:desc'].includes(query.sort)) invalid('sort');
  result.direction = query.sort === 'timestamp:asc' ? 1 : -1;
  for (const key of ['from', 'to']) {
    if (query[key] === undefined) continue;
    const value = query[key];
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)) invalid(key);
    const date = new Date(value);
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 19) !== value.slice(0, 19)) invalid(key);
    result[key] = date;
  }
  if (result.from && result.to && result.from > result.to) invalid('from/to');
  return result;
}

function paginated(data, totalCount, options, path, query) {
  const { page, pageSize } = options;
  const totalPages = Math.ceil(totalCount / pageSize);
  const link = (number) => {
    const parameters = new URLSearchParams(query);
    parameters.set('page', number);
    parameters.set('pageSize', pageSize);
    return `${path}?${parameters}`;
  };
  return { data, pagination: { page, pageSize, totalCount, totalPages }, links: {
    self: link(page), next: page < totalPages ? link(page + 1) : null, previous: page > 1 ? link(page - 1) : null,
  } };
}

module.exports = { parseListQuery, paginated };
