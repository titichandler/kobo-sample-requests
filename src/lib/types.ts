export const REQUEST_NUMBER_PREFIX = "KUK-SR-";
export const MANUAL_CODE_PLACEHOLDER = "MANUAL";

export const REQUEST_STATUS_NEW = "new" as const;
export const REQUEST_STATUS_SHIPPED = "shipped" as const;

export const FORMULA_STAGE_CLASSIFY = "classify" as const;
export const FORMULA_STAGE_MAKE = "make" as const;
export const FORMULA_STAGE_FILL = "fill" as const;
export const FORMULA_STAGE_DONE = "done" as const;

export type RequestStatus = typeof REQUEST_STATUS_NEW | typeof REQUEST_STATUS_SHIPPED;

export type FormulaStage =
  | typeof FORMULA_STAGE_CLASSIFY
  | typeof FORMULA_STAGE_MAKE
  | typeof FORMULA_STAGE_FILL
  | typeof FORMULA_STAGE_DONE;

export type RequestStatusFilter = RequestStatus | "all";

export type RequestStatusCounts = {
  new: number;
  shipped: number;
  all: number;
};

export type RequestBatch = {
  request_number: string;
  status: RequestStatus;
  shipped_at: string | null;
  hidden_from_view_at: string | null;
  updated_at: string;
  carrier: string | null;
  tracking_number: string | null;
  expected_delivery_date: string | null;
};

export type ShippingDetails = {
  carrier: string;
  tracking_number: string;
  expected_delivery_date?: string | null;
};

export type SampleLine = {
  id: number;
  request_number: string;
  formula_code: string;
  formula_name: string;
  num_samples: number;
  due_date: string | null;
  destination: string;
  request_origin: string;
  email: string;
  created_at: string;
  stage: FormulaStage;
};

export type ReadyToShipBatch = {
  request_number: string;
  email: string;
  request_origin: string;
  destination: string;
  created_at: string;
  formula_count: number;
  done_count: number;
};

export type ShippedBatchSummary = {
  request_number: string;
  email: string;
  destination: string;
  shipped_at: string | null;
  formula_count: number;
  carrier: string | null;
  tracking_number: string | null;
  expected_delivery_date: string | null;
};

export type ReviewBoardData = {
  classify: SampleLine[];
  make: SampleLine[];
  fill: SampleLine[];
  done: SampleLine[];
  readyToShip: ReadyToShipBatch[];
  shipped: ShippedBatchSummary[];
};

export type RequestSummary = {
  request_number: string;
  email: string;
  request_origin: string;
  destination: string;
  due_date: string | null;
  created_at: string;
  sample_count: number;
  total_samples: number;
  classify_count: number;
  make_count: number;
  fill_count: number;
  done_count: number;
  status: RequestStatus;
  shipped_at: string | null;
  hidden_from_view_at: string | null;
};

export type PendingSample = {
  formula_code: string;
  formula_name: string;
  num_samples: number;
  entry_type: "Manual" | "Library";
};

export type CreateRequestPayload = {
  email: string;
  request_origin: string;
  destination: string;
  due_date?: string | null;
  samples: Array<{
    formula_code: string;
    formula_name: string;
    num_samples: number;
  }>;
};

export type FormulaOption = {
  formula_code: string;
  formula_name: string;
  formula_type: string;
};
