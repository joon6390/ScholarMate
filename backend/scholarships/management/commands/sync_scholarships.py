from django.core.management.base import BaseCommand
from scholarships.models import Scholarship, RawScholarship # RawScholarship 모델 추가
import requests
from datetime import datetime
from django.conf import settings

API_URL = "https://api.odcloud.kr/api/15028252/v1/uddi:ccd5ddd5-754a-4eb8-90f0-cb9bce54870b"
SERVICE_KEY = settings.SERVICE_KEY

class Command(BaseCommand):
    help = "공공 API에서 장학금 정보를 가져와 RawScholarship에 저장하고, 이를 기반으로 Scholarship 테이블을 동기화합니다."

    def handle(self, *args, **options):
        # 1단계: API 데이터를 RawScholarship 테이블에 저장
        self.stdout.write(self.style.NOTICE("API에서 원본 장학금 데이터를 가져오는 중..."))
        page = 1
        
        while True:
            url = f"{API_URL}?serviceKey={SERVICE_KEY}&page={page}&perPage=100&returnType=JSON"
            try:
                response = requests.get(url, timeout=30)
                response.raise_for_status()
            except requests.exceptions.RequestException as e:
                self.stdout.write(self.style.ERROR(f"API 요청 실패: {e}"))
                break

            data = response.json().get("data", [])
            if not data:
                break

            for item in data:
                try:
                    product_name = item.get("상품명", "").strip()
                    org_name = item.get("운영기관명", "").strip()

                    if not product_name or not org_name:
                        self.stdout.write(self.style.WARNING(f"⚠️ '상품명' 또는 '운영기관명'이 없어 해당 항목 스킵: {item}"))
                        continue

                    product_id = f"{product_name}_{org_name}"
                    recruitment_start_parsed = self.safe_parse_date(item.get("모집시작일"))
                    recruitment_end_parsed = self.safe_parse_date(item.get("모집종료일"))

                    defaults = {
                        'name': product_name,
                        'foundation_name': org_name,
                        'recruitment_start': recruitment_start_parsed,
                        'recruitment_end': recruitment_end_parsed,
                        'university_type': item.get("대학구분", ""),
                        'product_type': item.get("학자금유형구분", ""),
                        'grade_criteria_details': item.get("성적기준 상세내용", ""),
                        'income_criteria_details': item.get("소득기준 상세내용", ""),
                        'support_details': item.get("지원내역 상세내용", ""),
                        'specific_qualification_details': item.get("특정자격 상세내용", ""),
                        'residency_requirement_details': item.get("지역거주여부 상세내용", ""),
                        'selection_method_details': item.get("선발방법 상세내용", ""),
                        'number_of_recipients_details': item.get("선발인원 상세내용", ""),
                        'eligibility_restrictions': item.get("자격제한 상세내용", ""),
                        'required_documents_details': item.get("제출서류 상세내용", ""),
                        'recommendation_required': item.get("추천필요여부 상세내용", "") == "필요",
                        'major_field': item.get("학과구분", ""),
                        'academic_year_type': item.get("학년구분", ""),
                        'managing_organization_type': item.get("운영기관구분", ""),
                    }
                    
                    RawScholarship.objects.update_or_create(
                        product_id=product_id,
                        defaults=defaults
                    )
                except Exception as e:
                    self.stdout.write(self.style.WARNING(f"❌ RawScholarship 저장 중 오류 발생: {e}"))
            
            self.stdout.write(f"페이지 {page}의 원본 데이터를 RawScholarship에 저장 완료...")
            page += 1
        
        self.stdout.write("\n✅ 원본 데이터 동기화 완료. 이제 추천 시스템 데이터를 가공합니다.")

        # 2단계: RawScholarship 데이터를 기반으로 Scholarship 테이블 업데이트
        created_count = 0
        updated_count = 0
        raw_scholarships = RawScholarship.objects.all()

        for raw_item in raw_scholarships:
            try:
                # 마감일이 지난 장학금 제외
                if raw_item.recruitment_end and raw_item.recruitment_end < datetime.now().date():
                    continue

                defaults = {
                    'name': raw_item.name,
                    'foundation_name': raw_item.foundation_name,
                    'recruitment_start': raw_item.recruitment_start,
                    'recruitment_end': raw_item.recruitment_end,
                    'university_type': raw_item.university_type,
                    'product_type': raw_item.product_type,
                    'grade_criteria_details': raw_item.grade_criteria_details,
                    'income_criteria_details': raw_item.income_criteria_details,
                    'support_details': raw_item.support_details,
                    'specific_qualification_details': raw_item.specific_qualification_details,
                    'residency_requirement_details': raw_item.residency_requirement_details,
                    'selection_method_details': raw_item.selection_method_details,
                    'number_of_recipients_details': raw_item.number_of_recipients_details,
                    'eligibility_restrictions': raw_item.eligibility_restrictions,
                    'required_documents_details': raw_item.required_documents_details,
                    'recommendation_required': raw_item.recommendation_required,
                    'major_field': raw_item.major_field,
                    'academic_year_type': raw_item.academic_year_type,
                    'managing_organization_type': raw_item.managing_organization_type,
                    # 이 필드들은 다음 전처리 과정에서 채워질 예정
                    'region': "",
                    'is_region_processed': False,
                }
                
                obj, created = Scholarship.objects.update_or_create(
                    product_id=raw_item.product_id,
                    defaults=defaults
                )

                if created:
                    created_count += 1
                else:
                    updated_count += 1
            except Exception as e:
                self.stdout.write(self.style.WARNING(f"❌ Scholarship 저장 중 오류 발생: {e}"))

        self.stdout.write(self.style.SUCCESS(f"\n✅ 동기화 완료: {created_count}개 생성, {updated_count}개 업데이트."))


    def safe_parse_date(self, date_str):
        if not date_str:
            return None
        try:
            return datetime.strptime(date_str, "%Y-%m-%d").date()
        except (ValueError, TypeError):
            return None