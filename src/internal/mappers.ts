import type {
  AddExampleRequest,
  ExampleResponse,
  GetRequestsData,
} from '../client/generated/types.gen';
import { DEFAULT_RESPONSE_CODE } from '../constants';
import type { IGetRequestHistoryOptions, IRequestConditions, IResponseData } from '../types';

/**
 * Maps SDK response data into the wire-format example response object.
 */
export function mapResponseDataToExampleResponse(data: IResponseData): ExampleResponse {
  return {
    code: data.code ?? DEFAULT_RESPONSE_CODE,
    headers: data.headers as Record<string, string> | undefined,
    body: data.body,
  };
}

/**
 * Maps request conditions and response data into an AddExampleRequest payload.
 */
export function mapConditionsToAddExampleRequest(
  conditions: IRequestConditions,
  responseData: IResponseData,
  once?: boolean,
  validate?: boolean
): AddExampleRequest {
  const { path, method, ...restConditions } = conditions;
  const request: AddExampleRequest = {
    path,
    method,
    once: once ?? responseData.once,
    validate: validate ?? responseData.validate,
    ...(responseData.ttl !== undefined ? { ttl: responseData.ttl } : {}),
    conditions:
      Object.keys(restConditions).length > 0
        ? (restConditions as AddExampleRequest['conditions'])
        : undefined,
    response: mapResponseDataToExampleResponse(responseData),
  };
  return request;
}

/**
 * Maps history options into the wire-format query params for the requests endpoint.
 */
export function mapHistoryOptionsToGetRequestsData(
  options?: IGetRequestHistoryOptions
): GetRequestsData['query'] {
  if (!options) return undefined;

  const { since, till, ...rest } = options;
  const query: GetRequestsData['query'] = {
    ...rest,
    time_from: typeof since === 'string' ? parseRelativeTime(since) : since,
    time_till: typeof till === 'string' ? parseRelativeTime(till) : till,
  };

  return Object.fromEntries(
    Object.entries(query).filter(([_, v]) => v !== undefined)
  ) as GetRequestsData['query'];
}

/**
 * Parses a relative time string like '-10s' or '+2h' into an epoch-ms timestamp.
 */
function parseRelativeTime(relative: string | undefined): number | undefined {
  if (!relative) return undefined;

  const now = Date.now();
  const match = relative.match(/^([+-]?)(\d+)([smhd])$/);
  if (!match) {
    throw new Error(
      `Invalid relative time format: ${relative}. Expected format like '-10s', '+2h'`
    );
  }

  const [, sign, amount, unit] = match;
  // amount and unit are guaranteed by regex pattern
  const value = parseInt(amount as string, 10);
  let multiplier = 1000; // seconds

  switch (unit as string) {
    case 's':
      multiplier = 1000;
      break;
    case 'm':
      multiplier = 1000 * 60;
      break;
    case 'h':
      multiplier = 1000 * 60 * 60;
      break;
    case 'd':
      multiplier = 1000 * 60 * 60 * 24;
      break;
  }

  const offset = value * multiplier;
  return sign === '-' ? now - offset : now + offset;
}
