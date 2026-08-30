export interface PublicPostBrowseEntry {
  id: string;
  title: string;
  description: string;
  href: string;
  date: string;
  category: string;
  tags: string[];
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

function normalized(value: string): string {
  return value.trim().toLocaleLowerCase('zh-CN');
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
    const searchable = normalized([post.title, post.description, post.category, ...post.tags].join(' '));
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
