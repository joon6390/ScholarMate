// src/pages/CommunityPage.jsx
import React, { useEffect, useState } from "react";
import {
  Input, Card, Avatar, Tag, Skeleton, Pagination, Button,
  message, Segmented, Tooltip,
} from "antd";
import {
  HeartOutlined, HeartFilled, ShareAltOutlined,
  BookOutlined, BookFilled, LoadingOutlined,
} from "@ant-design/icons";
import { Link, useSearchParams } from "react-router-dom";
import "../assets/css/community.css";
import {
  listPosts,
  likePost,
  unlikePost,
  bookmarkPost,
  unbookmarkPost,
  listBookmarkedPosts,
} from "../api/community";
import { fetchMe } from "../api/user";
import PostComposeModal from "../components/PostComposeModal";

export default function CommunityPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);

  // ✅ 보기 모드: 전체 / 내 북마크
  const [viewMode, setViewMode] = useState(
    searchParams.get("view") === "bookmarks" ? "bookmarks" : "all"
  );

  // 탭/검색/페이지
  const [category, setCategory] = useState(searchParams.get("category") || "story");
  const [order, setOrder] = useState(searchParams.get("order") || "latest"); // latest|popular
  const [q, setQ] = useState(searchParams.get("q") || "");
  const [searchInput, setSearchInput] = useState(searchParams.get("q") || "");
  const [page, setPage] = useState(Number(searchParams.get("page") || 1));
  const [pageSize, setPageSize] = useState(Number(searchParams.get("page_size") || 12));

  const ordering = order === "popular" ? "-view_count" : "-created_at";

  // 로그인 유저(글쓰기 노출/액션 보호)
  const [me, setMe] = useState(null);
  const [composeOpen, setComposeOpen] = useState(false);

  // 진행중 보호(중복 클릭 방지)
  const [pendingLike, setPendingLike] = useState(() => new Set());
  const [pendingBookmark, setPendingBookmark] = useState(() => new Set());

  const syncQuery = (next = {}) => {
    const params = new URLSearchParams({
      view: next.viewMode ?? viewMode,
      category: next.category ?? category,
      order: next.order ?? order,
      q: next.q ?? q,
      page: String(next.page ?? page),
      page_size: String(next.pageSize ?? pageSize),
    });
    setSearchParams(params);
  };

  // 서버 annotate 필드 → UI 전용 상태로 매핑
  const load = async () => {
    setLoading(true);
    try {
      const fetcher = viewMode === "bookmarks" ? listBookmarkedPosts : listPosts;
      const { items, total } = await fetcher({ category, q, page, pageSize, ordering });
      const mapped = (items || []).map((p) => ({
        ...p,
        _liked: !!p.is_liked,
        _bookmarked: !!p.is_bookmarked,
      }));
      setItems(mapped);
      setTotal(total);
    } catch (e) {
      console.error(e);
      message.error("목록을 불러오지 못했습니다.");
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const u = await fetchMe();
        setMe(u);
      } catch {
        setMe(null);
      }
    })();
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, [viewMode, category, q, page, pageSize, order]);

  const doSearch = () => {
    const val = searchInput.trim();
    setQ(val);
    setPage(1);
    syncQuery({ q: val, page: 1 });
  };

  const clearSearch = () => {
    setSearchInput("");
    setQ("");
    setPage(1);
    syncQuery({ q: "", page: 1 });
  };

  const onChangePage = (p, ps) => {
    setPage(p);
    if (ps !== pageSize) setPageSize(ps);
    syncQuery({ page: p, pageSize: ps });
  };

  const onShowSizeChange = (_, ps) => {
    setPageSize(ps);
    setPage(1);
    syncQuery({ page: 1, pageSize: ps });
  };

  // 공통: 로그인 필요 액션 보호
  const requireAuth = (actionName = "이 기능") => {
    if (!me) {
      message.warning(`${actionName}은(는) 로그인 후 이용 가능합니다.`);
      return false;
    }
    return true;
  };

  // 안전한 낙관적 업데이트 헬퍼
  const updateItem = (id, updater) => {
    setItems((prev) => prev.map((x) => (x.id === id ? updater(x) : x)));
  };

  // 좋아요 토글
  const handleLike = async (post, e) => {
    e?.preventDefault(); // 카드 Link 막기
    if (!requireAuth("좋아요")) return;

    if (pendingLike.has(post.id)) return; // 중복 방지
    const nextLiked = !post._liked;

    // 낙관적 업데이트
    updateItem(post.id, (x) => ({
      ...x,
      _liked: nextLiked,
      likes_count: Math.max(0, (x.likes_count || 0) + (nextLiked ? 1 : -1)),
    }));

    setPendingLike((s) => new Set(s).add(post.id));
    try {
      if (nextLiked) await likePost(post.id);
      else await unlikePost(post.id);
    } catch (err) {
      // 롤백
      updateItem(post.id, (x) => ({
        ...x,
        _liked: !nextLiked,
        likes_count: Math.max(0, (x.likes_count || 0) + (nextLiked ? -1 : 1)),
      }));
      console.error(err);
      message.error("좋아요 처리에 실패했어요.");
    } finally {
      setPendingLike((s) => {
        const ns = new Set(s);
        ns.delete(post.id);
        return ns;
      });
    }
  };

  // 북마크 토글
  const handleBookmark = async (post, e) => {
    e?.preventDefault();
    if (!requireAuth("북마크")) return;
    if (pendingBookmark.has(post.id)) return;

    const nextBookmarked = !post._bookmarked;
    updateItem(post.id, (x) => ({ ...x, _bookmarked: nextBookmarked }));

    setPendingBookmark((s) => new Set(s).add(post.id));
    try {
      if (nextBookmarked) await bookmarkPost(post.id);
      else await unbookmarkPost(post.id);
    } catch (err) {
      // 롤백
      updateItem(post.id, (x) => ({ ...x, _bookmarked: !nextBookmarked }));
      console.error(err);
      message.error("북마크 처리에 실패했어요.");
    } finally {
      setPendingBookmark((s) => {
        const ns = new Set(s);
        ns.delete(post.id);
        return ns;
      });

      // 🔑 북마크 보기 모드에서 해제 시 즉시 목록에서 제거
      if (viewMode === "bookmarks" && !nextBookmarked) {
        setItems((prev) => prev.filter((x) => x.id !== post.id));
        setTotal((t) => Math.max(0, t - 1));
      }
    }
  };

  // 공유
  const handleShare = async (post, e) => {
    e?.preventDefault();
    const shareUrl = `${window.location.origin}/community/${post.id}`;
    const shareData = {
      title: post.title || post.scholarship_name || "ScholarMate 커뮤니티",
      text: post.content ? post.content.slice(0, 80) : "",
      url: shareUrl,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareUrl);
        message.success("링크를 클립보드에 복사했어요!");
      }
    } catch {
      try {
        await navigator.clipboard.writeText(shareUrl);
        message.success("링크를 클립보드에 복사했어요!");
      } catch {
        message.error("공유에 실패했어요. 다시 시도해 주세요.");
      }
    }
  };

  const isLiking = (id) => pendingLike.has(id);
  const isBookmarking = (id) => pendingBookmark.has(id);

  return (
    <div className="min-h-screen bg-gray-50 font-sans flex flex-col">
      {/* ===== 상단 파란 헤더 ===== */}
      <div
        className="
          sticky top-[80px] z-40
          bg-gradient-to-r from-blue-500 to-indigo-600
          text-white px-6 py-6 shadow
        "
      >
        <div className="w-full px-6 md:px-10 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl md:text-3xl font-bold">ScholarMate 커뮤니티</h1>

            {/* 정렬 + 보기 모드 토글 */}
            <div className="flex gap-2">
              <Segmented
                value={order}
                onChange={(v) => {
                  setOrder(v);
                  setPage(1);
                  syncQuery({ order: v, page: 1 });
                }}
                options={[
                  { label: "최신", value: "latest" },
                  { label: "인기", value: "popular" },
                ]}
              />
              <Segmented
                value={viewMode}
                onChange={(v) => {
                  setViewMode(v);
                  setPage(1);
                  syncQuery({ viewMode: v, page: 1 });
                }}
                options={[
                  { label: "전체", value: "all" },
                  { label: "내 북마크", value: "bookmarks" },
                ]}
              />
            </div>
          </div>

          <div className="flex items-center justify-between flex-wrap gap-3">
            <Segmented
              value={category}
              onChange={(v) => {
                setCategory(v);
                setPage(1);
                syncQuery({ category: v, page: 1 });
              }}
              options={[
                { label: "스토리(후기)", value: "story" },
                { label: "피드(질문)", value: "feed" },
              ]}
            />

            {/* 검색 + 글쓰기 */}
            <div className="flex items-center gap-2 w/full md:w-auto md:flex-1 md:justify-end">
              <div className="w-full md:w-[28rem]">
                <div className="flex">
                  <Input
                    size="large"
                    placeholder="장학금, 작성자, 내용 검색..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onPressEnter={doSearch}
                    allowClear
                    onClear={clearSearch}
                    className="!h-11 !rounded-l-full !rounded-r-none !bg-white !border !border-gray-300 focus:!border-[#0B2D6B]"
                  />
                  <Button
                    type="primary"
                    size="large"
                    onClick={doSearch}
                    className="!h-11 !rounded-l-none !rounded-r-full !bg-black !border-black hover:!bg-neutral-800"
                  >
                    검색
                  </Button>
                </div>
              </div>

              {me && (
                <Button
                  type="primary"
                  onClick={() => setComposeOpen(true)}
                  className="!bg-black !border-black hover:!bg-neutral-800"
                >
                  글쓰기
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ===== 본문 ===== */}
      <main className="w-full px-6 md:px-10 py-8 pb-24 mt-20 flex-1">
        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4">
            게시글 <span className="text-gray-500 text-base">({total}건)</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
            {loading
              ? Array(6)
                  .fill(null)
                  .map((_, i) => (
                    <Card key={i} className="card-full shadow-md h-full">
                      <Skeleton avatar active paragraph={{ rows: 3 }} />
                    </Card>
                  ))
              : items.length > 0
              ? items.map((post) => {
                  const liking = isLiking(post.id);
                  const bookmarking = isBookmarking(post.id);
                  return (
                    <Link to={`/community/${post.id}`} key={post.id} className="block">
                      <Card
                        hoverable
                        className="card-full shadow-md hover:shadow-lg transition-shadow h-full"
                        actions={[
                          <div
                            key="like"
                            className={`cursor-pointer flex items-center justify-center ${liking ? "opacity-60 pointer-events-none" : ""}`}
                            onClick={(e) => handleLike(post, e)}
                            aria-label="좋아요"
                          >
                            {liking ? (
                              <LoadingOutlined />
                            ) : post._liked ? (
                              <HeartFilled className="text-red-500" />
                            ) : (
                              <HeartOutlined />
                            )}
                            <span className="ml-1">{post.likes_count ?? 0}</span>
                          </div>,
                          <div
                            key="bookmark"
                            className={`cursor-pointer flex items-center justify-center ${bookmarking ? "opacity-60 pointer-events-none" : ""}`}
                            onClick={(e) => handleBookmark(post, e)}
                            aria-label="북마크"
                          >
                            {bookmarking ? (
                              <LoadingOutlined />
                            ) : post._bookmarked ? (
                              <BookFilled className="text-blue-500" />
                            ) : (
                              <BookOutlined />
                            )}
                          </div>,
                          <Tooltip key="share" title="공유">
                            <ShareAltOutlined
                              className="cursor-pointer"
                              onClick={(e) => handleShare(post, e)}
                              aria-label="공유"
                            />
                          </Tooltip>,
                        ]}
                      >
                        <div className="post-body">
                          <div className="mb-3">
                            <div className="inline-block text-lg md:text-xl font-extrabold leading-snug">
                              {post.scholarship_name || "장학금"}
                            </div>
                          </div>

                          <div className="flex items-center mb-3">
                            <Avatar>
                              {post.author?.username?.[0]?.toUpperCase() || "U"}
                            </Avatar>
                            <div className="ml-3">
                              <div className="font-semibold">
                                {post.author?.username || "사용자"}
                              </div>
                              <div className="text-sm text-gray-500">
                                {new Date(post.created_at).toLocaleString()}
                              </div>
                            </div>
                          </div>

                          <h3 className="font-bold mb-2">{post.title || "제목 없음"}</h3>

                          <p className="text-gray-700 mb-3 post-content">
                            {post.content?.slice(0, 120)}
                            {post.content?.length > 120 ? "…" : ""}
                          </p>

                          <div className="flex flex-wrap gap-1 mt-auto">
                            {(post.tags || []).map((tag, idx) => (
                              <Tag key={idx} color="blue">
                                #{tag}
                              </Tag>
                            ))}
                          </div>
                        </div>
                      </Card>
                    </Link>
                  );
                })
              : (
                <div className="col-span-full text-center text-gray-500">
                  {viewMode === "bookmarks" ? "북마크한 게시글이 없습니다." : "표시할 게시글이 없습니다."}
                </div>
              )}
          </div>
        </section>
      </main>

      {/* ===== 하단 페이지네이션 ===== */}
      {!loading && total > 0 && (
        <div className="sticky bottom-0 z-30 bg-gray-50 border-t border-gray-200 py-4">
          <div className="flex justify-center">
            <Pagination
              current={page}
              pageSize={pageSize}
              total={total}
              onChange={onChangePage}
              showSizeChanger
              onShowSizeChange={onShowSizeChange}
              pageSizeOptions={["12", "24", "48"]}
              showTotal={(t, range) => `${range[0]}-${range[1]} / 총 ${t}건`}
            />
          </div>
        </div>
      )}

      {/* 글쓰기 모달 */}
      <PostComposeModal
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        onCreated={() => {
          setComposeOpen(false);
          setPage(1);
          load();
        }}
        defaultCategory={category}
      />
    </div>
  );
}
