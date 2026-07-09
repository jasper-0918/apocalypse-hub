// PostgREST caps a single SELECT at ~1000 rows (db-max-rows). For the few places
// that genuinely need the whole set (sitemap, a creator's full script list), page
// through with .range() until a short page comes back.
//
// Usage:
//   const rows = await selectAll((from, to) =>
//     supabase.from('scripts').select('id').eq('is_published', true).range(from, to)
//   );

export async function selectAll<T = any>(
  runPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: any }>,
  pageSize = 1000,
  hardCap = 50000
): Promise<T[]> {
  let out: T[] = [];
  for (let from = 0; from < hardCap; from += pageSize) {
    const { data, error } = await runPage(from, from + pageSize - 1);
    if (error || !data || data.length === 0) break;
    out = out.concat(data);
    if (data.length < pageSize) break; // last page
  }
  return out;
}
