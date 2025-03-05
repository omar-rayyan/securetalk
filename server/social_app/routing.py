from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'^ws/socket-server/home/$', consumers.HomeConsumer.as_asgi()),
    re_path(r'^ws/socket-server/(?P<chat_id>\w+)/$', consumers.ChatConsumer.as_asgi()),
]