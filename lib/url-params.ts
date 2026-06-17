export function hrefWithParam(
  pathname: string,
  searchParams: { toString(): string },
  key: string,
  value: string | null,
) {
  const params = new URLSearchParams(searchParams.toString());
  if (value === null) {
    params.delete(key);
  } else {
    params.set(key, value);
  }

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

