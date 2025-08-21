from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.shortcuts import get_object_or_404
from django.utils.dateparse import parse_date
from rest_framework.decorators import api_view, permission_classes

from .models import Scholarship, Wishlist, RawScholarship
from .serializers import (
    CalendarScholarshipSerializer,
    WishlistSerializer,
    ScholarshipSerializer,          # (다른 뷰에서 쓸 수 있으니 유지)
    RawScholarshipSerializer,
)
from userinfor.models import UserScholarship
from django.conf import settings
from .recommendation import recommend
import openai

# OpenAI 키
openai.api_key = settings.OPENAI_API_KEY


def get_processed_region_from_text(text: str) -> str:
    """장학금 공고의 지역 텍스트를 분석해 표준화된 지역 문자열로 변환."""
    if not text or text.strip().lower() in ["", "해당없음"]:
        return "전국"

    if not openai.api_key:
        print("경고: OpenAI API 키가 없어 지역 처리를 건너뜁니다.")
        return ""

    system_prompt = (
        "당신은 한국 행정구역 전문가입니다. 입력 텍스트에서 해당 지역을 "
        "가장 구체적인 전체 경로(도/시/군/구/면 단위)로 추출해 쉼표로 구분된 문자열만 반환하세요."
    )
    try:
        resp = openai.ChatCompletion.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": text},
            ],
            temperature=0.0,
            timeout=15,
        )
        result = resp.choices[0].message["content"].strip()
        return result.split("\n")[0]
    except Exception as e:
        print(f"[region] GPT 오류: {e}")
        return ""


class ScholarshipListView(APIView):
    """전체 장학금 목록: RawScholarship에서 필터/검색/정렬 + 페이지네이션"""
    permission_classes = [AllowAny]

    def get(self, request):
        try:
            qs = RawScholarship.objects.all()

            search_query = request.query_params.get("search", "")
            selected_type = request.query_params.get("type", "")
            sort_order = request.query_params.get("sort", "")

            if search_query:
                from django.db.models import Q
                qs = qs.filter(
                    Q(name__icontains=search_query)
                    | Q(foundation_name__icontains=search_query)
                    | Q(description__icontains=search_query)
                )

            if selected_type:
                qs = qs.filter(product_type=selected_type)

            if sort_order == "end_date":
                qs = qs.order_by("recruitment_end")

            try:
                page = int(request.query_params.get("page", 1))
                per_page = int(request.query_params.get("perPage", 10))
            except (TypeError, ValueError):
                page, per_page = 1, 10

            total = qs.count()
            start = max(0, (page - 1) * per_page)
            end = start + per_page

            data = RawScholarshipSerializer(qs[start:end], many=True).data
            return Response({"data": data, "total": total}, status=200)

        except Exception as e:
            print(f"[ScholarshipListView] 오류: {e}")
            return Response({"error": "데이터 조회 중 오류"}, status=500)


class ToggleWishlistAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        action = request.data.get("action")
        product_id = request.data.get("product_id")

        if action == "remove" and product_id:
            scholarship = get_object_or_404(Scholarship, product_id=product_id)
            Wishlist.objects.filter(user=request.user, scholarship=scholarship).delete()
            return Response({"status": "removed"}, status=200)

        scholarship_id = request.data.get("scholarship_id")
        if not scholarship_id:
            return Response({"error": "scholarship_id 필요"}, status=400)

        scholarship = get_object_or_404(Scholarship, id=scholarship_id)
        wl, created = Wishlist.objects.get_or_create(user=request.user, scholarship=scholarship)
        if not created:
            wl.delete()
            return Response({"status": "removed"}, status=200)
        return Response({"status": "added"}, status=200)


class UserWishlistAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        items = Wishlist.objects.filter(user=request.user).order_by("-added_at")
        return Response(WishlistSerializer(items, many=True).data, status=200)


class AddToWishlistFromAPI(APIView):
    """프론트에서 받은 단일 장학 데이터로 Scholarship 생성/업데이트 + 위시리스트 추가"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        data = request.data

        # 1) product_id 생성 규칙
        product_id = data.get("product_id") or f"{data.get('name','')}_{data.get('foundation_name','')}"
        if not product_id:
            return Response(
                {"error": "product_id 또는 (name, foundation_name) 필요"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 2) Scholarship upsert
        scholarship, created = Scholarship.objects.get_or_create(product_id=product_id)

        if created:
            residency_text = (
                data.get("residency_requirement_details")
                or data.get("지역거주여부 상세내용", "")
                or ""
            )
            processed_region = get_processed_region_from_text(residency_text)

            def parse_date_safely(v):
                if v and isinstance(v, str):
                    try:
                        return parse_date(v.split("~")[0].strip())
                    except Exception:
                        return None
                return None

            # 기본 필드
            scholarship.name = data.get("name") or data.get("장학금명", "")
            scholarship.foundation_name = data.get("foundation_name") or data.get("운영기관명", "")
            scholarship.recruitment_start = parse_date_safely(
                data.get("recruitment_start") or data.get("모집시작일")
            )
            scholarship.recruitment_end = parse_date_safely(
                data.get("recruitment_end") or data.get("모집종료일")
            )
            scholarship.university_type = data.get("university_type", "")
            scholarship.product_type = data.get("product_type", "")

            # 상세 필드
            scholarship.grade_criteria_details = data.get("grade_criteria_details") or data.get("성적기준 상세내용", "")
            scholarship.income_criteria_details = data.get("income_criteria_details") or data.get("소득기준 상세내용", "")
            scholarship.support_details = data.get("support_details") or data.get("지원내용 상세내용", "")
            scholarship.specific_qualification_details = data.get("specific_qualification_details") or data.get("특정자격 상세내용", "")
            scholarship.residency_requirement_details = residency_text

            scholarship.selection_method_details = data.get("selection_method_details") or data.get("선발방법 상세내용", "")
            scholarship.number_of_recipients_details = data.get("number_of_recipients_details") or data.get("선발인원 상세내용", "")
            scholarship.eligibility_restrictions = data.get("eligibility_restrictions") or data.get("자격제한 상세내용", "")
            scholarship.required_documents_details = data.get("required_documents_details") or data.get("제출서류 상세내용", "")

            # 추천 필요 여부 (bool/한글 모두 대응)
            scholarship.recommendation_required = (
                data.get("recommendation_required")
                if isinstance(data.get("recommendation_required"), bool)
                else (data.get("추천필요여부 상세내용") == "필요")
            )

            scholarship.major_field = data.get("major_field") or data.get("학과구분", "")
            scholarship.academic_year_type = data.get("academic_year_type") or data.get("학년구분", "")
            scholarship.managing_organization_type = data.get("managing_organization_type") or data.get("운영기관구분", "")

            # ✅ 홈페이지 URL (영문/한글 키 모두 대응)
            scholarship.url = data.get("url") or data.get("홈페이지URL") or ""

            # 지역 처리 결과
            scholarship.region = processed_region
            scholarship.is_region_processed = True

            scholarship.save()
            print(
                f"[AddToWishlistFromAPI] created name='{scholarship.name}', region='{scholarship.region}', url='{scholarship.url}'"
            )

        # 3) 위시리스트 추가/유지
        wl, created_wl = Wishlist.objects.get_or_create(user=request.user, scholarship=scholarship)
        return Response({"status": "added" if created_wl else "exists"}, status=200)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def remove_from_wishlist(request, pk):
    try:
        wl = Wishlist.objects.get(user=request.user, scholarship__id=pk)
        wl.delete()
        return Response({"status": "deleted"}, status=200)
    except Wishlist.DoesNotExist:
        return Response({"error": "해당 장학금이 관심 목록에 없습니다."}, status=404)


class MyCalendarView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        wishlisted = Wishlist.objects.filter(user=request.user)
        return Response(CalendarScholarshipSerializer(wishlisted, many=True).data, status=200)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_recommended_scholarships_api(request):
    print(f"[recommend] user={request.user.id} ({request.user.username})")
    try:
        try:
            profile = UserScholarship.objects.get(user=request.user)
            full_region = " ".join(filter(None, [profile.region, profile.district]))
            print(f"[recommend] profile ok: {profile.name}, region={full_region}")
        except UserScholarship.DoesNotExist:
            return Response(
                {"error": "사용자 프로필이 없습니다. 먼저 프로필을 작성해 주세요."}, status=404
            )

        rec = recommend(request.user.id)
        data = [s.to_dict() for s in rec]
        return Response({"scholarships": data}, status=200)

    except Exception as e:
        print(f"[recommend] 오류: {e}")
        return Response({"error": f"추천 중 오류 발생 ({e})"}, status=500)

