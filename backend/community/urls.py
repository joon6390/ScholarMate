from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PostViewSet, CommentViewSet, ConversationViewSet, DirectMessageViewSet

router = DefaultRouter()
router.register(r"posts", PostViewSet, basename="community-post")
router.register(r"comments", CommentViewSet, basename="community-comment")
router.register(r"conversations", ConversationViewSet, basename="community-conv")
router.register(r"messages", DirectMessageViewSet, basename="community-msg")

urlpatterns = [
    path("", include(router.urls)),
]
