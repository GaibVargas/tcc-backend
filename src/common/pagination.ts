import { z } from 'zod'

const page_default = 1
const page_size_default = 10
export const pagination_query_schema = z.object({
  page: z
    .string()
    .transform((v) => parseInt(v, 10))
    .transform((v) => (isNaN(v) ? page_default : v)),
  page_size: z
    .string()
    .transform((v) => parseInt(v, 10))
    .transform((v) => (isNaN(v) ? page_size_default : v)),
})
export type PaginationQuery = z.infer<typeof pagination_query_schema>

export type PrismaPaginationQuery = {
  skip: number
  take: number
}
export function getPrismaPagination(
  query: PaginationQuery,
): PrismaPaginationQuery {
  const skip = (query.page - 1) * query.page_size
  const take = query.page_size
  return {
    skip,
    take,
  }
}

export type Paginated<T> = {
  items: T
  count: number
}
