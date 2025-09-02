import random
from django.conf import settings
from django.core.cache import cache
from django.core.mail import send_mail
from rest_framework import status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView

def _code_key(email: str) -> str:
    return f"email_verify:code:{email.lower()}"

def _cooldown_key(email: str) -> str:
    return f"email_verify:cooldown:{email.lower()}"

def _verified_key(email: str) -> str:
    return f"email_verify:verified:{email.lower()}"

class SendEmailCodeView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = (request.data.get("email") or "").strip()
        if not email:
            return Response({"detail": "이메일을 입력해 주세요."}, status=status.HTTP_400_BAD_REQUEST)

        # 재전송 쿨다운
        if cache.get(_cooldown_key(email)):
            return Response({"detail": "잠시 후 다시 시도해 주세요."}, status=status.HTTP_429_TOO_MANY_REQUESTS)

        # 6자리 코드 생성
        code = f"{random.randint(0, 999999):06d}"
        ttl = getattr(settings, "EMAIL_VERIFICATION_CODE_TTL", 120)
        cooldown = getattr(settings, "EMAIL_VERIFICATION_COOLDOWN", 60)

        # 캐시에 코드/쿨다운 저장
        cache.set(_code_key(email), code, ttl)
        cache.set(_cooldown_key(email), True, cooldown)
        cache.delete(_verified_key(email))  # 이전 검증 상태 초기화

        # 메일 발송
        subject = "[ScholarMate] 이메일 인증번호"
        minutes = max(1, ttl // 60)
        message = f"인증번호: {code}\n유효시간: {minutes}분"
        try:
            send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [email], fail_silently=False)
        except Exception as e:
            return Response({"detail": f"메일 전송 실패: {e}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({"detail": "인증번호를 전송했습니다.", "ttl": ttl}, status=status.HTTP_200_OK)

class VerifyEmailCodeView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = (request.data.get("email") or "").strip()
        code = (request.data.get("code") or "").strip()
        if not email or not code:
            return Response({"detail": "이메일과 인증번호를 입력해 주세요."}, status=status.HTTP_400_BAD_REQUEST)

        saved = cache.get(_code_key(email))
        if not saved:
            return Response({"detail": "인증번호가 만료되었거나 전송되지 않았습니다."}, status=status.HTTP_400_BAD_REQUEST)
        if code != saved:
            return Response({"detail": "인증번호가 올바르지 않습니다."}, status=status.HTTP_400_BAD_REQUEST)

        # 검증 성공 플래그(10분 유지)
        cache.set(_verified_key(email), True, 600)
        cache.delete(_code_key(email))  # 일회성 사용

        return Response({"detail": "이메일 인증이 완료되었습니다."}, status=status.HTTP_200_OK)
