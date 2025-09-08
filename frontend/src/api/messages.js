// src/api/messages.js
import api from "./axios";

/**
 * 대화방 목록 가져오기
 * GET /messages/conversations/
 */
export async function fetchConversations() {
  const { data } = await api.get("/messages/conversations/");
  return Array.isArray(data) ? data : [];
}

/**
 * 특정 대화방 메시지 목록 가져오기
 * GET /messages/messages/?conversation={id}
 */
export async function fetchMessages(conversationId) {
  const { data } = await api.get("/messages/messages/", {
    params: { conversation: conversationId },
  });
  return Array.isArray(data) ? data : [];
}

/**
 * 메시지 전송
 * POST /messages/messages/
 * @param {Object} params
 * @param {number} params.conversationId - 대화방 ID
 * @param {string} params.content - 메시지 내용
 */
export async function sendMessage({ conversationId, content }) {
  const { data } = await api.post("/messages/messages/", {
    conversation: conversationId,
    body: content,   // 백엔드가 body 필드를 받을 경우
    content,         // content 필드도 함께 전송 (호환성)
  });
  return data;
}

/**
 * 읽음 처리
 * POST /messages/messages/mark-read/
 */
export async function markRead(conversationId) {
  await api.post("/messages/messages/mark-read/", { conversation: conversationId });
}

/**
 * (옵션) 전체 미읽음 합산
 */
export async function fetchUnreadCount() {
  const list = await fetchConversations();
  return list.reduce((sum, c) => sum + (c.unread_count || 0), 0);
}
