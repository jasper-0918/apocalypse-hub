// Plain shared constants — no 'use client' / no server-only imports, so both a
// server component and a client component can import these safely. (Importing a
// value out of a 'use client' module from the server yields a client reference
// proxy, not the value, so shared constants must live in a neutral module.)

/** Page size /discover renders by default. The server pre-renders this many
 *  cards and the client pager starts from the same number. */
export const DISCOVER_PAGE_SIZE = 48;
