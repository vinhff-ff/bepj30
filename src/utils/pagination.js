const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;

// Chuẩn hoá query ?page=&pageSize=, chặn giá trị rác
function getPagination(query) {
  const parsedPage = parseInt(query.page, 10);
  const parsedPageSize = parseInt(query.pageSize, 10);

  const page = Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;
  const pageSize = Number.isNaN(parsedPageSize) || parsedPageSize < 1
    ? DEFAULT_PAGE_SIZE
    : Math.min(parsedPageSize, MAX_PAGE_SIZE);

  return { page, pageSize };
}

module.exports = { getPagination, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE };
