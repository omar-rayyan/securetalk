from django.urls import path
from social_app import views

urlpatterns = [
    path('/contacts' , views.get_contacts),
    path('/chats' , views.get_chats),
    path('/chats/create', views.create_chat),
    path('/chats/<int:chat_id>/messages', views.get_chat_messages),
    path('/chats/<int:chat_id>/messages/mark_as_read', views.mark_chat_messages_as_read),
    path('/chats/<int:chat_id>/new_message', views.create_chat_message),
]