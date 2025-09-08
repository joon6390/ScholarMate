# community/serializers.py
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Post, Comment, PostLike, PostBookmark, Conversation, DirectMessage

User = get_user_model()


# =========================
# User 미니 정보
# =========================
class UserMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "username")


# =========================
# 댓글
# =========================
class CommentSerializer(serializers.ModelSerializer):
    author = UserMiniSerializer(read_only=True)
    replies_count = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = ("id", "post", "author", "content", "parent", "created_at", "replies_count")
        read_only_fields = ("author", "created_at")

    def get_replies_count(self, obj):
        return obj.replies.count()

    def create(self, validated_data):
        request = self.context["request"]
        validated_data["author"] = request.user
        return super().create(validated_data)


# =========================
# 게시글
# =========================
class PostSerializer(serializers.ModelSerializer):
    author = UserMiniSerializer(read_only=True)

    # ✔ 뷰에서 annotate 한 값들
    likes_count = serializers.IntegerField(read_only=True)
    bookmarks_count = serializers.IntegerField(read_only=True)
    comments_count = serializers.IntegerField(read_only=True)
    is_liked = serializers.BooleanField(read_only=True)
    is_bookmarked = serializers.BooleanField(read_only=True)

    class Meta:
        model = Post
        fields = (
            "id", "author", "scholarship_name", "category", "title", "content", "tags",
            "author_is_recipient", "is_published", "view_count",
            "likes_count", "bookmarks_count", "comments_count",
            "is_liked", "is_bookmarked",
            "created_at", "updated_at",
        )
        read_only_fields = (
            "author", "view_count",
            "likes_count", "bookmarks_count", "comments_count",
            "is_liked", "is_bookmarked",
            "created_at", "updated_at",
        )

    def create(self, validated_data):
        request = self.context["request"]
        validated_data["author"] = request.user
        return super().create(validated_data)


# =========================
# 대화 (Conversation)
# =========================
class ConversationSerializer(serializers.ModelSerializer):
    participants = UserMiniSerializer(many=True, read_only=True)

    # ✔ annotate 된 필드들
    latest_message = serializers.CharField(read_only=True)
    latest_time = serializers.DateTimeField(read_only=True)
    unread_count = serializers.IntegerField(read_only=True)

    # ✔ 내가 아닌 상대방
    partner = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = (
            "id",
            "participants",
            "partner",
            "latest_message",
            "latest_time",
            "unread_count",
            "created_at",
        )

    def get_partner(self, obj):
        me = self.context["request"].user
        others = [u for u in obj.participants.all() if u.id != me.id]
        if not others:
            return None
        u = others[0]
        return {"id": u.id, "username": getattr(u, "username", str(u))}


# =========================
# 메시지 (DirectMessage)
# =========================
class DirectMessageSerializer(serializers.ModelSerializer):
    sender = UserMiniSerializer(read_only=True)

    class Meta:
        model = DirectMessage
        fields = ("id", "conversation", "sender", "content", "created_at", "is_read")
        read_only_fields = ("sender", "created_at", "is_read")

    def create(self, validated_data):
        request = self.context["request"]
        validated_data["sender"] = request.user
        return super().create(validated_data)

