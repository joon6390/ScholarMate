from rest_framework.generics import CreateAPIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.core.mail import EmailMultiAlternatives
from django.conf import settings
from .models import Contact
from .serializers import ContactSerializer

class ContactCreateView(CreateAPIView):
    queryset = Contact.objects.all()
    serializer_class = ContactSerializer
    permission_classes = [AllowAny]

    def perform_create(self, serializer):
        instance = serializer.save()  # DB 저장

        # 관리자 메일 알림(실패해도 서비스 영향 없게 처리)
        subject = "[문의 알림] 새 문의가 도착했습니다"
        text_body = (
            f"이름: {instance.name}\n"
            f"이메일: {instance.email}\n\n"
            f"메시지:\n{instance.message}\n\n"
            f"접수시각: {instance.created_at:%Y-%m-%d %H:%M:%S}"
        )
        html_body = f"""
            <h3>새 문의가 도착했습니다</h3>
            <p><b>이름:</b> {instance.name}</p>
            <p><b>이메일:</b> {instance.email}</p>
            <p><b>메시지:</b><br/>{instance.message.replace('\n','<br/>')}</p>
            <p><b>접수시각:</b> {instance.created_at:%Y-%m-%d %H:%M:%S}</p>
        """
        to_emails = getattr(settings, "CONTACT_ADMIN_EMAILS", [])
        from_email = getattr(settings, "DEFAULT_FROM_EMAIL", None)
        if to_emails and from_email:
            try:
                msg = EmailMultiAlternatives(subject, text_body, from_email, to_emails)
                msg.attach_alternative(html_body, "text/html")
                msg.send(fail_silently=True)
            except Exception:
                pass  # 로그만 남기고 무시해도 됨

    def create(self, request, *args, **kwargs):
        super().create(request, *args, **kwargs)
        return Response({"ok": True}, status=status.HTTP_201_CREATED)
