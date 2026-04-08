import { Response } from "express";

export function parsePagination(query: {
  page?: string | number;
  limit?: string | number;
}) {
  const page = parseInt(String(query.page ?? "1"), 10);
  const limit = parseInt(String(query.limit ?? "20"), 10);
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

export function buildPagination(page: number, limit: number, total: number) {
  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export function respondValidationError(res: Response, errors: unknown[]) {
  return res.status(400).json({ errors });
}
