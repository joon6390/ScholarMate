from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import NoticeViewSet

router = DefaultRouter()
router.register("", NoticeViewSet, basename="notice")  # prefix 제거

urlpatterns = [
    path("", include(router.urls)),
]

