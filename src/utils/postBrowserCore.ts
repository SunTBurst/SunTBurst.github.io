export interface PublicPostBrowseEntry {
  id: string;
  title: string;
  description: string;
  href: string;
  date: string;
  category: string;
  tags: string[];
  searchText?: string;
}

export interface PostBrowseState {
  query: string;
  category: string;
  tag: string;
  page: number;
}

export interface PostBrowseResult {
  items: PublicPostBrowseEntry[];
  totalItems: number;
  totalPages: number;
  page: number;
  pageNumbers: number[];
  hasPrevious: boolean;
  hasNext: boolean;
}

type PostBrowseClick = Pick<
  MouseEvent,
  'altKey' | 'button' | 'ctrlKey' | 'defaultPrevented' | 'metaKey' | 'preventDefault' | 'shiftKey'
>;

function normalized(value: string): string {
  return value.trim().toLocaleLowerCase('zh-CN');
}

function cleanQuery(value: string): string {
  return value.trim().slice(0, 200);
}

function publicOption(value: string | null, options: string[]): string {
  if (!value) return '';
  const candidate = normalized(value);
  return options.find((option) => normalized(option) === candidate) ?? '';
}

export function parsePostBrowseSearch(
  search: string,
  categories: string[],
  tags: string[],
): PostBrowseState {
  const params = new URLSearchParams(search);
  const pageValue = params.get('page') ?? '';
  const parsedPage = /^[1-9]\d*$/.test(pageValue) ? Number(pageValue) : 1;
  return {
    query: cleanQuery(params.get('q') ?? ''),
    category: publicOption(params.get('category'), categories),
    tag: publicOption(params.get('tag'), tags),
    page: Number.isSafeInteger(parsedPage) ? parsedPage : 1,
  };
}

export function buildPostBrowseHref(currentHref: string, state: PostBrowseState): string {
  const hashIndex = currentHref.indexOf('#');
  const hash = hashIndex >= 0 ? currentHref.slice(hashIndex) : '';
  const beforeHash = hashIndex >= 0 ? currentHref.slice(0, hashIndex) : currentHref;
  const queryIndex = beforeHash.indexOf('?');
  const pathname = (queryIndex >= 0 ? beforeHash.slice(0, queryIndex) : beforeHash) || '/posts';
  const searchParams = new URLSearchParams(queryIndex >= 0 ? beforeHash.slice(queryIndex + 1) : '');
  const values = {
    q: cleanQuery(state.query),
    category: state.category.trim(),
    tag: state.tag.trim(),
  };
  for (const [key, value] of Object.entries(values)) {
    if (value) searchParams.set(key, value);
    else searchParams.delete(key);
  }
  if (state.page > 1) searchParams.set('page', String(Math.floor(state.page)));
  else searchParams.delete('page');
  const search = searchParams.toString();
  return `${pathname}${search ? `?${search}` : ''}${hash}`;
}

export function activatePostBrowseLink(click: PostBrowseClick, activate: () => void): boolean {
  if (
    click.defaultPrevented
    || click.button !== 0
    || click.altKey
    || click.ctrlKey
    || click.metaKey
    || click.shiftKey
  ) {
    return false;
  }
  click.preventDefault();
  activate();
  return true;
}

function visiblePageNumbers(page: number, totalPages: number): number[] {
  const visibleCount = Math.min(5, totalPages);
  const start = Math.min(
    Math.max(1, page - Math.floor(visibleCount / 2)),
    totalPages - visibleCount + 1,
  );
  return Array.from({ length: visibleCount }, (_, index) => start + index);
}

export function browsePosts(
  posts: PublicPostBrowseEntry[],
  state: PostBrowseState,
  requestedPageSize = 6,
): PostBrowseResult {
  const query = normalized(state.query);
  const category = normalized(state.category);
  const tag = normalized(state.tag);
  const pageSize = Math.max(1, Math.floor(requestedPageSize));
  const filtered = posts.filter((post) => {
    const searchable = normalized([post.title, post.description, post.category, ...post.tags, post.searchText ?? ''].join(' '));
    return (!query || searchable.includes(query))
      && (!category || normalized(post.category) === category)
      && (!tag || post.tags.some((item) => normalized(item) === tag));
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const requestedPage = Number.isFinite(state.page) ? Math.floor(state.page) : 1;
  const page = Math.min(Math.max(1, requestedPage), totalPages);
  const start = (page - 1) * pageSize;

  return {
    items: filtered.slice(start, start + pageSize),
    totalItems: filtered.length,
    totalPages,
    page,
    pageNumbers: visiblePageNumbers(page, totalPages),
    hasPrevious: page > 1,
    hasNext: page < totalPages,
  };
}
