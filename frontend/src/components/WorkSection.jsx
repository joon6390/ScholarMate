import React from "react";
import {
  FaUserPlus,
  FaSearch,
  FaComments,
  FaClipboardList,
} from "react-icons/fa";

export default function HowItWorksSection() {
  const steps = [
    {
      icon: <FaUserPlus className="text-black text-xl" />,
      title: "프로필 등록",
      description: "학점, 전공, 활동 내역 등 기본 정보를 입력하세요.",
    },
    {
      icon: <FaSearch className="text-black text-xl" />,
      title: "맞춤 장학금 추천",
      description: "AI가 프로필을 분석하여 적합한 장학금을 추천해 드립니다.",
    },
    {
      icon: <FaComments className="text-black text-xl" />,
      title: "경험 공유 확인",
      description: "수혜자들의 합격 후기와 조언을 참고하세요.",
    },
    {
      icon: <FaClipboardList className="text-black text-xl" />,
      title: "지원 및 관리",
      description: "지원서 작성 가이드를 참고하고 마감일을 관리하세요.",
    },
  ];

  return (
    // 👇 id="how-to" 추가
    <section id="how-to" className="mt-24 py-20 bg-gray-50">
      <div className="w-full px-0">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">이용 방법</h2>
          <p className="text-lg text-gray-600">
            ScholarMate를 통해 맞춤형 장학금을 찾고 지원하는 과정을 알아보세요.
          </p>
        </div>

        <div className="grid md:grid-cols-4 gap-8 px-6">
          {steps.map((step, index) => (
            <div
              key={index}
              className="bg-white p-6 rounded-lg shadow-sm text-center relative"
            >
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                  <i className="fas fa-chevron-right text-black text-xl"></i>
                </div>
              )}
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                {step.icon}
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                {step.title}
              </h3>
              <p className="text-gray-600">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
