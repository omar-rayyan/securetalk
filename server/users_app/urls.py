from django.urls import path
from users_app import views

urlpatterns = [
    path('/register', views.register),
    path('/login' , views.login),
    path('/logout' , views.logout),
    path('/user_details' , views.get_user_details),
    path('/update_profile', views.update_profile),
    path('/upload_profile_pic', views.upload_profile_pic),
    path('/change_password', views.change_password),
]