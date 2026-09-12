export interface ServiceSuccess<T> {
  success: true;
  data: T;
}

export interface ServiceFailure {
  success: false;
  error: string;
}

export type ServiceResult<T> =
  | ServiceSuccess<T>
  | ServiceFailure;

export function serviceSuccess<T>(data: T): ServiceSuccess<T> {
  return { success: true, data };
}

export function serviceFailure(error: string): ServiceFailure {
  return { success: false, error };
}
