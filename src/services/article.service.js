const { prisma } = require("../config/db");
const { AppError } = require("../utils/AppError");
const {
  validateArticleTitle,
  validateArticleSlug,
  validateArticleExcerpt,
  validateArticleContent,
  validateArticleCategory,
  validateArticleTags,
  validateOptionalImageUrl,
} = require("../utils/validators");
const { ARTICLE_SELECT, ARTICLE_DETAIL_SELECT } = require("../utils/select");

async function listArticles({ category, search, page = 1, limit = 50 } = {}) {
  const where = {};

  if (category && category !== "all") {
    const catUpper = category.trim().toUpperCase();
    where.category = catUpper;
  }

  if (search && search.trim()) {
    const q = search.trim();
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { excerpt: { contains: q, mode: "insensitive" } },
      { author: { contains: q, mode: "insensitive" } },
    ];
  }

  const take = Math.min(Math.max(1, Number(limit) || 50), 100);
  const skip = Math.max(0, (Number(page) - 1) * take);

  const [total, articles] = await Promise.all([
    prisma.article.count({ where }),
    prisma.article.findMany({
      where,
      select: ARTICLE_SELECT,
      orderBy: [{ tier: "asc" }, { publishedAt: "desc" }, { createdAt: "desc" }],
      take,
      skip,
    }),
  ]);

  return {
    total,
    page: Number(page) || 1,
    limit: take,
    totalPages: Math.ceil(total / take) || 1,
    articles,
  };
}

async function getArticleById(id) {
  const article = await prisma.article.findUnique({
    where: { id },
    select: ARTICLE_DETAIL_SELECT,
  });

  if (!article) {
    throw AppError.notFound("Không tìm thấy bài viết");
  }

  return article;
}

async function getArticleBySlugOrId(identifier) {
  let article = await prisma.article.findFirst({
    where: {
      OR: [{ slug: identifier }, { id: identifier }],
    },
    select: ARTICLE_DETAIL_SELECT,
  });

  if (!article) {
    throw AppError.notFound("Không tìm thấy bài viết");
  }

  // Tăng lượt xem bất đồng bộ
  try {
    await prisma.article.update({
      where: { id: article.id },
      data: { views: { increment: 1 } },
    });
  } catch {
    // Không chặn luồng đọc nếu cập nhật view thất bại
  }

  return article;
}

async function ensureUniqueSlug(candidateSlug, excludeId = null) {
  let slug = candidateSlug;
  let counter = 1;

  while (true) {
    const existing = await prisma.article.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!existing || (excludeId && existing.id === excludeId)) {
      return slug;
    }

    slug = `${candidateSlug}-${counter}`;
    counter++;
  }
}

// Tự động đẩy cấp theo quy tắc:
// 1. Khi có bài gán cấp 1: Bài cấp 1 hiện tại bị đẩy xuống cấp 2.
// 2. Nếu bài cấp 2 quá 5 bài: Tự đẩy các bài cũ hơn xuống cấp 3.
async function cascadeTiers(targetTier, excludeId = null) {
  if (targetTier === 1) {
    const existingTier1 = await prisma.article.findMany({
      where: {
        tier: 1,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });

    if (existingTier1.length > 0) {
      await prisma.article.updateMany({
        where: { id: { in: existingTier1.map((a) => a.id) } },
        data: { tier: 2 },
      });
    }
  }

  // Kiểm tra cấp 2: tối đa 5 bài
  const tier2Articles = await prisma.article.findMany({
    where: {
      tier: 2,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    select: { id: true },
  });

  const maxExistingInTier2 = targetTier === 2 ? 4 : 5;
  if (tier2Articles.length > maxExistingInTier2) {
    const demoteToTier3 = tier2Articles.slice(maxExistingInTier2);
    await prisma.article.updateMany({
      where: { id: { in: demoteToTier3.map((a) => a.id) } },
      data: { tier: 3 },
    });
  }
}

async function createArticle(payload, createdById = null) {
  const title = validateArticleTitle(payload.title);
  const baseSlug = validateArticleSlug(payload.slug, title);
  const slug = await ensureUniqueSlug(baseSlug);
  const excerpt = validateArticleExcerpt(payload.excerpt);
  const content = validateArticleContent(payload.content);
  const category = validateArticleCategory(payload.category);
  const tags = validateArticleTags(payload.tags);
  const coverImage = validateOptionalImageUrl(payload.coverImage);

  const author =
    payload.author && typeof payload.author === "string" && payload.author.trim()
      ? payload.author.trim()
      : "Ban Biên Tập";
  const authorRole =
    payload.authorRole && typeof payload.authorRole === "string" ? payload.authorRole.trim() : null;
  const readTime =
    payload.readTime && typeof payload.readTime === "string" ? payload.readTime.trim() : "5 phút";
  const featured = Boolean(payload.featured);
  const hot = Boolean(payload.hot);

  // Xác định cấp (1, 2, 3), mặc định 3 (hoặc 1 nếu featured)
  const tier = payload.tier
    ? Math.min(Math.max(1, Number(payload.tier)), 3)
    : featured
      ? 1
      : 3;
  await cascadeTiers(tier);

  let publishedAt = new Date();
  if (payload.publishedAt) {
    const d = new Date(payload.publishedAt);
    if (!Number.isNaN(d.getTime())) {
      publishedAt = d;
    }
  }

  return prisma.article.create({
    data: {
      title,
      slug,
      excerpt,
      content,
      coverImage: coverImage || null,
      category,
      author,
      authorRole,
      publishedAt,
      readTime,
      featured,
      hot,
      tier,
      tags,
      createdById: createdById || null,
    },
    select: ARTICLE_DETAIL_SELECT,
  });
}

async function updateArticle(id, payload) {
  await getArticleById(id);

  const data = {};

  if (payload.title !== undefined) {
    data.title = validateArticleTitle(payload.title);
  }

  if (payload.slug !== undefined) {
    const baseSlug = validateArticleSlug(payload.slug, payload.title || "bai-viet");
    data.slug = await ensureUniqueSlug(baseSlug, id);
  }

  if (payload.excerpt !== undefined) {
    data.excerpt = validateArticleExcerpt(payload.excerpt);
  }

  if (payload.content !== undefined) {
    data.content = validateArticleContent(payload.content);
  }

  if (payload.coverImage !== undefined) {
    data.coverImage = validateOptionalImageUrl(payload.coverImage) || null;
  }

  if (payload.category !== undefined) {
    data.category = validateArticleCategory(payload.category);
  }

  if (payload.author !== undefined) {
    data.author = payload.author?.trim() || "Ban Biên Tập";
  }

  if (payload.authorRole !== undefined) {
    data.authorRole = payload.authorRole?.trim() || null;
  }

  if (payload.readTime !== undefined) {
    data.readTime = payload.readTime?.trim() || "5 phút";
  }

  if (payload.featured !== undefined) {
    data.featured = Boolean(payload.featured);
  }

  if (payload.hot !== undefined) {
    data.hot = Boolean(payload.hot);
  }

  if (payload.tier !== undefined) {
    const tier = Math.min(Math.max(1, Number(payload.tier)), 3);
    await cascadeTiers(tier, id);
    data.tier = tier;
  }

  if (payload.tags !== undefined) {
    data.tags = validateArticleTags(payload.tags);
  }

  if (payload.publishedAt !== undefined) {
    const d = new Date(payload.publishedAt);
    if (!Number.isNaN(d.getTime())) {
      data.publishedAt = d;
    }
  }

  if (Object.keys(data).length === 0) {
    throw AppError.badRequest("Không có trường nào để cập nhật");
  }

  return prisma.article.update({
    where: { id },
    data,
    select: ARTICLE_DETAIL_SELECT,
  });
}

async function deleteArticle(id) {
  await getArticleById(id);
  await prisma.article.delete({ where: { id } });
  return { id };
}

module.exports = {
  listArticles,
  getArticleById,
  getArticleBySlugOrId,
  createArticle,
  updateArticle,
  deleteArticle,
};
