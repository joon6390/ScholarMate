from django.contrib import admin
from django.urls import path, include
from django.http import HttpResponse

def api_server_status(request):
    return HttpResponse("API 서버가 정상적으로 작동하고 있습니다.")

urlpatterns = [
    # 관리자
    path("admin/", admin.site.urls),

    # Auth & Accounts
    path("api/auth/", include("accounts.urls")),      # 이메일 인증, 아이디 찾기 등
    path("api/auth/", include("djoser.urls")),        # 회원가입 / 유저정보
    path("api/auth/", include("djoser.urls.jwt")),    # JWT 로그인 / 로그아웃

    # 장학금 앱
    path("api/scholarships/", include("scholarships.urls")),

    # 유저 정보 앱
    path("api/userinfor/", include("userinfor.urls")),

    # Contact 앱
    path("api/contact/", include("contact.urls")),

    # Notices 앱
    path("api/notices/", include("notices.urls")),

    # Community 앱
    path("api/community/", include("community.urls")),

    # 서버 상태 확인
    path("", api_server_status),
]


