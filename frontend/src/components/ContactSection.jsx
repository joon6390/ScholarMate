import { useState } from "react";
import axios from "axios";

export default function ContactSection() {
  const API = import.meta.env.VITE_API_BASE_URL; // 예: https://<서버>/api
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: "", msg: "" });

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  // 안전한 URL 조인 (빈 값/슬래시/스페이스 방어)
  const join = (base, path) => {
    const b = String(base || "").trim().replace(/\/+$/, "");
    const p = String(path || "").trim().replace(/^\/+/, "");
    return b ? `${b}/${p}` : `/${p}`;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    // 간단 유효성
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      setStatus({ type: "error", msg: "모든 항목을 입력해주세요." });
      return;
    }
    // 기본적인 이메일 패턴 체크
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setStatus({ type: "error", msg: "이메일 형식을 확인해주세요." });
      return;
    }

    try {
      setLoading(true);
      setStatus({ type: "", msg: "" });

      // ✅ /api/contact/ 로 전송
      const url = join(API, "/api/contact/");
      await axios.post(url, form, {
        headers: { "Content-Type": "application/json" },
        // 필요 시 withCredentials: true,
      });

      setForm({ name: "", email: "", message: "" });
      setStatus({ type: "ok", msg: "문의가 접수되었습니다." });
    } catch (err) {
      console.error("[Contact submit error]", err?.response?.status, err?.response?.data || err.message);
      setStatus({ type: "error", msg: "전송에 실패했습니다. 잠시 후 다시 시도해주세요." });
    } finally {
      setLoading(false);
    }
  };

  return (
    // 👇 홈에서 스크롤 이동용 앵커
    <section id="contact" className="py-20 bg-gray-50 w-full">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* 문의하기 폼 */}
          <div className="px-4 md:px-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-left">문의하기</h2>

            <form className="space-y-6" onSubmit={onSubmit} noValidate>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 text-left" htmlFor="contact-name">이름</label>
                <input
                  id="contact-name"
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={onChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white text-black focus:ring-custom focus:border-custom"
                  placeholder="이름을 입력하세요"
                  required
                  autoComplete="name"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 text-left" htmlFor="contact-email">이메일</label>
                <input
                  id="contact-email"
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={onChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white text-black focus:ring-custom focus:border-custom"
                  placeholder="이메일을 입력하세요"
                  required
                  autoComplete="email"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 text-left" htmlFor="contact-message">문의 내용</label>
                <textarea
                  id="contact-message"
                  rows="4"
                  name="message"
                  value={form.message}
                  onChange={onChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white text-black focus:ring-custom focus:border-custom"
                  placeholder="문의 내용을 입력하세요"
                  required
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-md bg-black px-6 py-3 text-white font-medium hover:bg-gray-800 disabled:opacity-60"
                disabled={loading}
                aria-busy={loading}
              >
                {loading ? "전송 중..." : "문의하기"}
              </button>

              {!!status.msg && (
                <p
                  className={`mt-3 text-sm ${status.type === "ok" ? "text-green-600" : "text-red-600"}`}
                  role="status"
                >
                  {status.msg}
                </p>
              )}
            </form>
          </div>

          {/* 연락처 정보 */}
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-left">연락처 정보</h2>
            <div className="space-y-6">
              <div className="flex items-start">
                <i className="fas fa-map-marker-alt text-custom text-xl mt-1" aria-hidden="true"></i>
                <div className="ml-4 text-left">
                  <h3 className="text-lg font-medium text-gray-900">주소</h3>
                  <p className="mt-2 text-gray-600">경기도 안성시 한경국립대학교 3층 318호</p>
                </div>
              </div>
              <div className="flex items-start">
                <i className="fas fa-phone text-custom text-xl mt-1" aria-hidden="true"></i>
                <div className="ml-4 text-left">
                  <h3 className="text-lg font-medium text-gray-900">전화</h3>
                  <p className="mt-2 text-gray-600">031-1234-5678</p>
                </div>
              </div>
              <div className="flex items-start">
                <i className="fas fa-envelope text-custom text-xl mt-1" aria-hidden="true"></i>
                <div className="ml-4 text-left">
                  <h3 className="text-lg font-medium text-gray-900">이메일</h3>
                  <p className="mt-2 text-gray-600">contact@hknu.com</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
