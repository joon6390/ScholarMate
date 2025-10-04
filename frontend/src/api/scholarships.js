// src/api/scholarships.js
import api from "./axios";

/** DRF pagination 대응 */
function asPage(data) {
  if (!data) return { items: [], total: 0 };
  if (Array.isArray(data)) return { items: data, total: data.length };
  return {
    items: data.results ?? [],
    total: data.count ?? (data.results?.length ?? 0),
  };
}

/* =========================
 * Scholarships
 * =======================*/

/** 장학금 목록 조회 */
export async function listScholarships({
  page = 1,
  pageSize = 10,
  ordering = "-deadline",
  search = "",
} = {}) {
  const params = {
    page,
    page_size: pageSize,
    ordering,
    search: search || undefined,
  };
  const { data } = await api.get("/scholarships/", { params });
  return asPage(data);
}

/** 특정 장학금 상세 */
export async function getScholarship(id) {
  const { data } = await api.get(`/scholarships/${id}/`);
  return data;
}

/** 추천 장학금 */
export async function getRecommendedScholarships(userId) {
  const { data } = await api.post("/recommendation/", { user_id: userId });
  return data;
}

/* =========================
 * Wishlist (찜)
 * =======================*/

/** 찜 토글 */
export async function toggleWishlist(id) {
  const { data } = await api.post("/wishlist/toggle/", { scholarship_id: id });
  return data;
}

/** 내가 찜한 장학금 목록 */
export async function listWishlist({
  page = 1,
  pageSize = 10,
  ordering = "-deadline",
} = {}) {
  const params = { page, page_size: pageSize, ordering };
  const { data } = await api.get("/wishlist/", { params });
  return asPage(data);
}

/** 찜 삭제 */
export async function deleteWishlist(pk) {
  await api.delete(`/wishlist/delete/${pk}/`);
}

/** 외부 API에서 추가 */
export async function addWishlistFromApi(scholarshipData) {
  const { data } = await api.post("/wishlist/add-from-api/", scholarshipData);
  return data;
}
