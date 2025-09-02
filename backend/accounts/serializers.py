from django.conf import settings
from django.core.cache import cache
from djoser.serializers import UserCreateSerializer as BaseUserCreateSerializer
from rest_framework import serializers

def _verified_key(email: str) -> str:
    return f"email_verify:verified:{email.lower()}"

class UserCreateSerializer(BaseUserCreateSerializer):
    def validate(self, attrs):
        attrs = super().validate(attrs)
        if not getattr(settings, "ENABLE_EMAIL_VERIFICATION", False):
            return attrs  # 토글 OFF면 기존 흐름 유지
        email = attrs.get("email", "")
        if not email:
            raise serializers.ValidationError({"email": "이메일을 입력해 주세요."})
        if not cache.get(_verified_key(email)):
            raise serializers.ValidationError({"email": "이메일 인증이 필요합니다. 인증번호를 확인해 주세요."})
        return attrs
