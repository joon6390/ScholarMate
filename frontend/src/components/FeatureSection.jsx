import React from "react";
import { FaChartLine, FaUsers, FaClock, FaBookmark } from "react-icons/fa";

export default function FeatureSection() {
  const features = [
    {
      icon: <FaChartLine className="text-2xl text-white" />,
      title: "통합 검색",
      description: "모든 장학금 정보를 한 번에 검색",
    },
    {
      icon: <FaUsers className="text-2xl text-white" />,
      title: "AI 추천",
      description: "개인화된 맞춤형 장학금 추천",
    },
    {
      icon: <FaClock className="text-2xl text-white" />,
      title: "알림 서비스",
      description: "마감일 및 중요 일정 알림",
    },
    {
      icon: <FaBookmark className="text-2xl text-white" />,
      title: "관리 서비스",
      description: "관심 장학금을 저장하고 쉽게 관리",
    },
  ];

  return (
    // 👇 id="features" 추가
    <section id="features" className="py-20 bg-gray-50 w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900">시스템 특징</h2>
          <p className="mt-4 text-lg text-gray-600">
            더 스마트한 장학금 관리를 경험하세요
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((item, index) => (
            <div key={index} className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-black mb-4">
                {item.icon}
              </div>
              <h3 className="text-lg font-semibold mb-2 text-gray-900">
                {item.title}
              </h3>
              <p className="text-gray-600">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}


