import type { CreateRequestPayload } from "./types";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function validateCreateRequest(payload: CreateRequestPayload): string[] {
  const errors: string[] = [];

  if (!payload.email?.trim()) {
    errors.push("Email address is required.");
  } else if (!EMAIL_RE.test(payload.email.trim())) {
    errors.push("Enter a valid email address.");
  }

  if (!payload.contact_name?.trim()) {
    errors.push("Name is required.");
  }

  if (!payload.request_origin?.trim()) {
    errors.push("Request origin is required.");
  }

  if (!payload.destination?.trim()) {
    errors.push("Destination is required.");
  }

  if (!payload.samples?.length) {
    errors.push("Add at least one sample before submitting.");
  }

  for (const [index, sample] of (payload.samples ?? []).entries()) {
    const line = index + 1;
    if (!sample.formula_name?.trim()) {
      errors.push(`Sample ${line}: formula name is required.`);
    }
    if (!sample.formula_code?.trim()) {
      errors.push(`Sample ${line}: formula code is required.`);
    }
    if (!Number.isFinite(sample.num_samples) || sample.num_samples <= 0) {
      errors.push(`Sample ${line}: number of samples must be greater than 0.`);
    }
  }

  return errors;
}
