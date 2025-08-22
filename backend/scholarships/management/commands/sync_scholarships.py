from django.core.management.base import BaseCommand
from scholarships.models import Scholarship, RawScholarship
from django.conf import settings
import requests
from datetime import datetime
from urllib.parse import unquote


API_URL = "https://api.odcloud.kr/api/15028252/v1/uddi:ccd5ddd5-754a-4eb8-90f0-cb9bce54870b"
SERVICE_KEY = settings.SERVICE_KEY


class Command(BaseCommand):
    help = "공공 API에서 장학금 정보를 RawScholarship에 저장하고, 이를 기반으로 Scholarship 테이블을 동기화합니다."

    # --- helpers -------------------------------------------------------------
    def _normalize_service_key(self, key: str) -> str:
        """
        settings에 serviceKey가 %2B, %252F 처럼 인코딩돼 들어온 경우
        원래 값으로 복원한다.
        """
        if not key:
            return key
        prev, cur = None, key.strip()
        while prev != cur and ("%25" in cur or "%2" in cur.lower()):
            prev = cur
            cur = unquote(cur)
        return cur

    def safe_parse_date(self, date_str):
        if not date_str:
            return None
        try:
            return datetime.strptime(date_str, "%Y-%m-%d").date()
        except (ValueError, TypeError):
            return None

    # --- main ----------------------------------------------------------------
    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("API에서 원본 장학금 데이터를 가져오는 중..."))
        page = 1
        total_raw_upserted = 0

        service_key = self._normalize_service_key(SERVICE_KEY)

        # 1) 공공데이터 API → RawScholarship 적재
        while True:
            try:
                params = {
                    "serviceKey": service_key,
                    "page": page,
                    "perPage": 100,
                    "returnType": "JSON",
                }
                resp = requests.get(API_URL, params=params, timeout=30)
                resp.raise_for_status()
            except requests.exceptions.RequestException as e:
                self.stdout.write(self.style.ERROR(f"API 요청 실패: {e}"))
                break

            rows = resp.json().get("data", [])
            if not rows:
                break

            for item in rows:
                try:
                    product_name = (item.get("상품명") or "").strip()
                    org_name = (item.get("운영기관명") or "").strip()
                    if not product_name or not org_name:
                        self.stdout.write(self.style.WARNING("⚠️ 상품명/운영기관명 누락 → 스킵"))
                        continue

                    product_id = f"{product_name}_{org_name}"

                    # 다양한 키에 대응하여 URL 추출
                    url_value = (
                        item.get("url")
                        or item.get("URL")
                        or item.get("홈페이지URL")
                        or item.get("홈페이지 주소")
                        or item.get("홈페이지")
                        or ""
                    )

                    defaults = {
                        "name": product_name,
                        "foundation_name": org_name,
                        "recruitment_start": self.safe_parse_date(item.get("모집시작일")),
                        "recruitment_end": self.safe_parse_date(item.get("모집종료일")),
                        "university_type": item.get("대학구분", ""),
                        "product_type": item.get("학자금유형구분", ""),
                        "grade_criteria_details": item.get("성적기준 상세내용", ""),
                        "income_criteria_details": item.get("소득기준 상세내용", ""),
                        "support_details": item.get("지원내역 상세내용", ""),
                        "specific_qualification_details": item.get("특정자격 상세내용", ""),
                        "residency_requirement_details": item.get("지역거주여부 상세내용", ""),
                        "selection_method_details": item.get("선발방법 상세내용", ""),
                        "number_of_recipients_details": item.get("선발인원 상세내용", ""),
                        "eligibility_restrictions": item.get("자격제한 상세내용", ""),
                        "required_documents_details": item.get("제출서류 상세내용", ""),
                        "recommendation_required": item.get("추천필요여부 상세내용", "") == "필요",
                        "major_field": item.get("학과구분", ""),
                        "academic_year_type": item.get("학년구분", ""),
                        "managing_organization_type": item.get("운영기관구분", ""),
                        "url": url_value,  # ✅ URL 채움
                    }

                    RawScholarship.objects.update_or_create(
                        product_id=product_id, defaults=defaults
                    )
                    total_raw_upserted += 1
                except Exception as e:
                    self.stdout.write(self.style.WARNING(f"❌ RawScholarship 저장 오류: {e}"))

            self.stdout.write(f"페이지 {page} 저장 완료…")
            page += 1

        self.stdout.write(
            self.style.SUCCESS(f"✅ 원본 데이터 동기화 완료 (upsert {total_raw_upserted}건). 이제 추천용 테이블을 갱신합니다.")
        )

        # 2) RawScholarship → Scholarship 전파
        created_count, updated_count = 0, 0
        today = datetime.now().date()

        for raw in RawScholarship.objects.all():
            try:
                # 마감일 지난 건 제외 (정책 필요 시 조정)
                if raw.recruitment_end and raw.recruitment_end < today:
                    continue

                defaults = {
                    "name": raw.name,
                    "foundation_name": raw.foundation_name,
                    "recruitment_start": raw.recruitment_start,
                    "recruitment_end": raw.recruitment_end,
                    "university_type": raw.university_type,
                    "product_type": raw.product_type,
                    "grade_criteria_details": raw.grade_criteria_details,
                    "income_criteria_details": raw.income_criteria_details,
                    "support_details": raw.support_details,
                    "specific_qualification_details": raw.specific_qualification_details,
                    "residency_requirement_details": raw.residency_requirement_details,
                    "selection_method_details": raw.selection_method_details,
                    "number_of_recipients_details": raw.number_of_recipients_details,
                    "eligibility_restrictions": raw.eligibility_restrictions,
                    "required_documents_details": raw.required_documents_details,
                    "recommendation_required": raw.recommendation_required,
                    "major_field": raw.major_field,
                    "academic_year_type": raw.academic_year_type,
                    "managing_organization_type": raw.managing_organization_type,
                    "url": raw.url or "",     # ✅ URL 전파
                    "region": "",             # 지역 전처리는 별도 커맨드에서
                    "is_region_processed": False,
                }

                _, created = Scholarship.objects.update_or_create(
                    product_id=raw.product_id, defaults=defaults
                )
                if created:
                    created_count += 1
                else:
                    updated_count += 1
            except Exception as e:
                self.stdout.write(self.style.WARNING(f"❌ Scholarship 저장 오류: {e}"))

        self.stdout.write(
            self.style.SUCCESS(f"✅ 동기화 완료: 생성 {created_count}개 / 업데이트 {updated_count}개.")
        )
