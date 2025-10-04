from django.urls import path
from .views import (
    ScholarshipListView,
    ToggleWishlistAPIView,
    UserWishlistAPIView,
    AddToWishlistFromAPI,
    remove_from_wishlist,  
    MyCalendarView,
    get_recommended_scholarships_api
)

urlpatterns = [
    path('', ScholarshipListView.as_view(), name='scholarship-list'),   # ✅ /api/scholarships/
    path('wishlist/toggle/', ToggleWishlistAPIView.as_view(), name='wishlist-toggle'),
    path('wishlist/', UserWishlistAPIView.as_view(), name='wishlist-list'),
    path('wishlist/add-from-api/', AddToWishlistFromAPI.as_view(), name='wishlist-add-from-api'),
    path('wishlist/delete/<int:pk>/', remove_from_wishlist, name='wishlist-delete'),
    path('calendar/', MyCalendarView.as_view(), name='my-calendar'),
    path('recommendation/', get_recommended_scholarships_api, name='recommend-scholarships-api'),
]


