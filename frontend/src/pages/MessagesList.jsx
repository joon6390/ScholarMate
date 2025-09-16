// src/pages/MessagesList.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import {
  Card,
  Spin,
  Empty,
  Badge,
  Button,
  Popconfirm,
  message as antdMessage,
} from "antd";

export default function MessagesList() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState(null);
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      // DRF 페이지네이션/배열 모두 대응
      const { data } = await api.get("/api/community/conversations/", {
        params: { page_size: 50, ordering: "-latest_time" },
      });
      const list = Array.isArray(data) ? data : data?.results ?? [];
      setItems(list);
    } catch (e) {
      console.error(e);
      antdMessage.error("쪽지 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // 대화방 삭제(또는 나가기) - DELETE 우선, 실패 시 leave 엔드포인트 폴백
  const removeConversation = async (id) => {
    setRemovingId(id);
    try {
      try {
        await api.delete(`/api/community/conversations/${id}/`);
      } catch (e) {
        // 405/404 등일 때 커스텀 나가기 엔드포인트 시도
        await api.post(`/api/community/conversations/${id}/leave/`);
      }
      setItems((prev) => prev.filter((c) => String(c.id) !== String(id)));
      antdMessage.success("대화방을 삭제했습니다.");
    } catch (e) {
      console.error(e);
      antdMessage.error("대화방 삭제에 실패했습니다.");
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <main className="pt-28 pb-20 w-[min(92vw,800px)] mx-auto">
      <Card title="쪽지함">
        {loading ? (
          <div className="py-12 flex justify-center">
            <Spin />
          </div>
        ) : items.length === 0 ? (
          <Empty description="받은 대화가 없습니다." />
        ) : (
          <ul className="divide-y">
            {items.map((c) => {
              // 백엔드에서 partner 내려줌
              const other = c.partner?.username ?? "알 수 없음";

              // 최신 메시지
              const last = c.latest_message ?? "";

              // 최신 시간
              const at = c.latest_time
                ? new Date(c.latest_time).toLocaleString()
                : "";

              // 읽지 않은 메시지 수
              const unread = c.unread_count ?? 0;

              return (
                <li
                  key={c.id}
                  className="py-3 px-2 hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/messages/${c.id}`)}
                >
                  <div className="flex items-center justify-between gap-3">
                    {/* 왼쪽: 상대 / 최신미리보기 */}
                    <div className="min-w-0">
                      <div className="font-medium">
                        {unread > 0 ? (
                          <Badge count={unread} offset={[8, -2]}>
                            {other}
                          </Badge>
                        ) : (
                          other
                        )}
                      </div>
                      <div className="text-sm text-gray-600 mt-1 line-clamp-1">
                        {last || "최근 메시지가 없습니다."}
                      </div>
                    </div>

                    {/* 오른쪽: 시간 & 삭제 버튼 */}
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-xs text-gray-400">{at}</div>
                      <Popconfirm
                        title="이 대화방을 삭제할까요?"
                        description="대화 목록에서 제거됩니다."
                        okText="삭제"
                        cancelText="취소"
                        okButtonProps={{ danger: true, loading: removingId === c.id }}
                        onConfirm={(e) => {
                          e?.stopPropagation?.();
                          removeConversation(c.id);
                        }}
                        onCancel={(e) => e?.stopPropagation?.()}
                      >
                        <Button
                          danger
                          size="small"
                          loading={removingId === c.id}
                          onClick={(e) => e.stopPropagation()} // 리스트 클릭으로 이동 막기
                        >
                          삭제
                        </Button>
                      </Popconfirm>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </main>
  );
}
