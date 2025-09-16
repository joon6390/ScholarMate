// src/App.jsx
import { useState, useEffect, useRef } from "react";
import { Route, Routes, Navigate, Link, useNavigate, useLocation } from "react-router-dom";
import Home from "./pages/Home";
import Scholarships from "./pages/Scholarships";
import Profile from "./pages/Profile";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Useinfor from "./pages/Userinfor";
import PrivateRoute from "./components/PrivateRoute";
import logo from "./assets/img/로고.png";
import Wishlist from "./components/Wishlist";
import CalendarPage from "./pages/Calendar";
import isTokenExpired from "./api/auth";
import Recommendation from "./pages/Recommendation";
import CommunityPage from "./pages/CommunityPage";
import Introduction from "./pages/Introduction";
import NoticeList from "./pages/NoticeList";
import NoticeDetail from "./pages/NoticeDetail";
import CommunityDetail from "./pages/CommunityDetail";
import "antd/dist/reset.css";
import Messages from "./pages/Messages";
import MessagesList from "./pages/MessagesList";
import HeaderMessagesIcon from "./components/HeaderMessagesIcon";

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const pendingHashRef = useRef(null);

  // 로그인 상태 점검
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token && isTokenExpired(token)) {
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      setIsLoggedIn(false);
    } else {
      setIsLoggedIn(!!token);
    }
  }, [location.pathname]);

  // ===== 공통 Drawer Item (Link / button 통일) =====
  const itemCls =
    "block w-full text-left px-3 py-2 rounded-lg text-gray-800 hover:bg-gray-100 active:bg-gray-200 transition";
  const DrawerItem = ({ to, onClick, children }) =>
    to ? (
      <Link to={to} onClick={onClick} className={itemCls}>
        {children}
      </Link>
    ) : (
      <button type="button" onClick={onClick} className={itemCls}>
        {children}
      </button>
    );

  // ===== 강력 스크롤 헬퍼 =====
  const scrollToSectionId = (sectionId) => {
    const el = document.getElementById(sectionId);
    if (!el) return false;

    const headerH = document.querySelector(".header")?.offsetHeight || 80;
    const container = document.querySelector("main.content");

    // 기본 시도
    try {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch (_) {
      const topFallback = el.getBoundingClientRect().top + window.scrollY - headerH;
      window.scrollTo({ top: topFallback, behavior: "smooth" });
    }

    // 컨테이너 스크롤 보정
    if (container && getComputedStyle(container).overflowY !== "visible") {
      const cRect = container.getBoundingClientRect();
      const tRect = el.getBoundingClientRect();
      const top = container.scrollTop + (tRect.top - cRect.top) - headerH;
      container.scrollTo({ top, behavior: "smooth" });
    }

    return true;
  };

  // 해시 접근/변경 시 스크롤
  useEffect(() => {
    const hash = location.hash?.slice(1) || pendingHashRef.current;
    if (!hash) return;

    let tries = 0;
    const tick = () => {
      tries++;
      const ok = scrollToSectionId(hash);
      if (!ok && tries < 40) requestAnimationFrame(tick);
      else pendingHashRef.current = null;
    };
    requestAnimationFrame(tick);
  }, [location.key, location.hash]);

  const handleLogin = () => {
    setIsLoggedIn(true);
    navigate("/", { replace: true });
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    setIsLoggedIn(false);
    navigate("/", { replace: true });
  };

  // 홈 섹션으로 이동
  const goToSection = (sectionId) => {
    setSidebarOpen(false);

    if (location.pathname !== "/") {
      pendingHashRef.current = sectionId;
      navigate(`/#${sectionId}`);
      return;
    }

    if (location.hash !== `#${sectionId}`) {
      history.replaceState(null, "", `/#${sectionId}`);
    }

    setTimeout(() => {
      if (!scrollToSectionId(sectionId)) {
        let tries = 0;
        const id = setInterval(() => {
          tries++;
          const ok = scrollToSectionId(sectionId);
          if (ok || tries > 30) clearInterval(id);
        }, 50);
      }
    }, 0);
  };

  return (
    <>
      <header className="header">
        <div className="header-left">
          <Link
            to="/"
            style={{ textDecoration: "none", color: "inherit", display: "flex", alignItems: "center" }}
          >
            <img src={logo} alt="Logo" className="logo" />
            <h1 className="text-center text-2xl font-bold">ScholarMate</h1>
          </Link>
        </div>

        <nav className="nav">
          <Link to="/scholarships" className="nav-btn">
            전체 장학금
          </Link>
          <Link to="/recommendation" className="nav-btn">
            추천 장학금
          </Link>
          <Link to="/interest" className="nav-btn">
            관심 장학금
          </Link>
          <Link to="/calendar" className="nav-btn">
            나의 장학 캘린더
          </Link>
          <Link to="/Userinfor" className="nav-btn">
            나의 장학 정보
          </Link>
        </nav>

        <div
          className="header-right"
          style={{ display: "flex", gap: "10px", alignItems: "center", whiteSpace: "nowrap" }}
        >
          <button
            type="button"
            className="sidebar-toggle-btn"
            aria-label="사이드바 열기"
            aria-controls="left-drawer"
            aria-expanded={sidebarOpen}
            onClick={() => setSidebarOpen((v) => !v)}
            title="메뉴"
          >
            ☰
          </button>

          <Link to="/messages" className="nav-btn">
            쪽지함
          </Link>
          <HeaderMessagesIcon />
          {isLoggedIn ? (
            <button className="login-btn" onClick={() => navigate("/profile")}>
              마이페이지
            </button>
          ) : (
            <button className="login-btn" style={{ visibility: "hidden" }}>
              마이페이지
            </button>
          )}
          {isLoggedIn ? (
            <button className="logout-btn" onClick={handleLogout}>
              로그아웃
            </button>
          ) : (
            <button className="login-btn" onClick={() => navigate("/login")}>
              로그인
            </button>
          )}
        </div>
      </header>

      {/* ==== Drawer ==== */}
      <div id="left-drawer" className={`drawer ${sidebarOpen ? "open" : ""}`} onClick={() => setSidebarOpen(false)}>
        <nav
          className="drawer-panel"
          role="dialog"
          aria-modal="true"
          aria-label="주 메뉴"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="drawer-head">
            <strong>메뉴</strong>
            <button type="button" className="drawer-close" aria-label="사이드바 닫기" onClick={() => setSidebarOpen(false)}>
              ×
            </button>
          </div>

          <div className="drawer-links">
            <DrawerItem to="/community" onClick={() => setSidebarOpen(false)}>
              커뮤니티
            </DrawerItem>
            <DrawerItem to="/notice" onClick={() => setSidebarOpen(false)}>
              공지사항
            </DrawerItem>
            <DrawerItem to="/introduction" onClick={() => setSidebarOpen(false)}>
              서비스 소개
            </DrawerItem>

            <hr className="drawer-sep my-2" />

            <DrawerItem onClick={() => goToSection("features")}>시스템 특징</DrawerItem>
            <DrawerItem onClick={() => goToSection("functions")}>주요 기능</DrawerItem>
            <DrawerItem onClick={() => goToSection("how-to")}>이용 방법</DrawerItem>
            <DrawerItem onClick={() => goToSection("contact")}>문의하기</DrawerItem>
          </div>

          <hr className="drawer-sep my-3" />

          <div className="drawer-actions">
            {isLoggedIn ? (
              <>
                <button
                  type="button"
                  className="drawer-btn primary"
                  onClick={() => {
                    setSidebarOpen(false);
                    navigate("/profile");
                  }}
                >
                  마이페이지
                </button>
                <button
                  type="button"
                  className="drawer-btn"
                  onClick={() => {
                    setSidebarOpen(false);
                    handleLogout();
                  }}
                >
                  로그아웃
                </button>
              </>
            ) : (
              <button
                type="button"
                className="drawer-btn primary"
                onClick={() => {
                  setSidebarOpen(false);
                  handleLogin();
                }}
              >
                로그인
              </button>
            )}
          </div>
        </nav>
      </div>

      <main className="content">
        <Routes>
          <Route path="/" element={<Home />} />

          <Route
            path="/scholarships"
            element={
              <PrivateRoute isLoggedIn={isLoggedIn}>
                <Scholarships />
              </PrivateRoute>
            }
          />
          <Route
            path="/recommendation"
            element={
              <PrivateRoute isLoggedIn={isLoggedIn}>
                <Recommendation />
              </PrivateRoute>
            }
          />
          <Route
            path="/interest"
            element={
              <PrivateRoute isLoggedIn={isLoggedIn}>
                <Wishlist />
              </PrivateRoute>
            }
          />
          <Route
            path="/calendar"
            element={
              <PrivateRoute isLoggedIn={isLoggedIn}>
                <CalendarPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/Userinfor"
            element={
              <PrivateRoute isLoggedIn={isLoggedIn}>
                <Useinfor />
              </PrivateRoute>
            }
          />
          <Route
            path="/community"
            element={
              <PrivateRoute isLoggedIn={isLoggedIn}>
                <CommunityPage />
              </PrivateRoute>
            }
          />

          <Route path="/profile" element={isLoggedIn ? <Profile /> : <Navigate to="/login" />} />
          <Route path="/login" element={isLoggedIn ? <Navigate to="/" /> : <Login onLogin={handleLogin} />} />
          <Route path="/register" element={isLoggedIn ? <Navigate to="/" /> : <Register />} />
          <Route path="/introduction" element={<Introduction />} />
          <Route path="/notice" element={<NoticeList />} />
          <Route path="/notice/:id" element={<NoticeDetail />} />
          <Route path="/community/:id" element={<CommunityDetail />} />

          {/* /features, /functions, /how-to, /news, /contact 라우트는 만들지 않음 */}

          {/* 쪽지 */}
          <Route
            path="/messages"
            element={
              <PrivateRoute isLoggedIn={isLoggedIn}>
                <MessagesList />
              </PrivateRoute>
            }
          />
          <Route
            path="/messages/:conversationId"
            element={
              <PrivateRoute isLoggedIn={isLoggedIn}>
                <Messages />
              </PrivateRoute>
            }
          />
        </Routes>
      </main>
    </>
  );
}
