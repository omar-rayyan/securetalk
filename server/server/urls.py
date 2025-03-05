from django.urls import path
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('securetalk/api/users', include('users_app.urls')),
    path('securetalk/api/social', include('social_app.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)