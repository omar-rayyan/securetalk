import json
from channels.generic.websocket import WebsocketConsumer
from asgiref.sync import async_to_sync

class ChatConsumer(WebsocketConsumer):
    def connect(self):
        self.accept()
        self.chat_id = self.scope['url_route']['kwargs']['chat_id']
        async_to_sync(self.channel_layer.group_add)(
            self.chat_id,
            self.channel_name
        )
        print(f"Connected to chat: {self.chat_id}")

    def disconnect(self, close_code):
        print(f"Disconnected from chat: {self.chat_id}")
        async_to_sync(self.channel_layer.group_discard)(
            self.chat_id,
            self.channel_name
        )

    def receive(self, text_data):
        text_data_json = json.loads(text_data)
        print("ChatConsumer received:", text_data_json)

        async_to_sync(self.channel_layer.group_send)(
            self.chat_id,
            {
                'type': text_data_json['type'],
                'message': text_data_json
            }
        )

        async_to_sync(self.channel_layer.group_send)(
            'home',
            {
                'type': text_data_json['type'],
                'message': text_data_json
            }
        )

    def new_message(self, event):
        message = event['message']
        self.send(text_data=json.dumps({
            'message': message['message'],
            'type': message['type'],
            'chat_id': message['chat_id'],
        }))

    def mark_as_read(self, event):
        message = event['message']
        self.send(text_data=json.dumps({
            'message_id': message['message_id'],
            'type': message['type'],
            'chat_id': message['chat_id'],
        }))

    def mark_all_as_read(self, event):
        message = event['message']
        self.send(text_data=json.dumps({
            'type': message['type'],
            'chat_id': message['chat_id'],
        }))

class HomeConsumer(WebsocketConsumer):
    def connect(self):
        self.accept()
        async_to_sync(self.channel_layer.group_add)(
            'home',
            self.channel_name
        )
        print("Connected to home channel")

    def disconnect(self, close_code):
        print("Disconnected from home channel")
        async_to_sync(self.channel_layer.group_discard)(
            'home',
            self.channel_name
        )

    def receive(self, text_data):
        text_data_json = json.loads(text_data)
        print("HomeConsumer received:", text_data_json)

        async_to_sync(self.channel_layer.group_send)(
            'home',
            {
                'type': text_data_json['type'],
                'message': text_data_json
            }
        )

    def new_message(self, event):
        message = event['message']
        self.send(text_data=json.dumps({
            'message': message['message'],
            'type': message['type'],
            'chat_id': message['chat_id'],
        }))

    def mark_all_as_read(self, event):
        message = event['message']
        self.send(text_data=json.dumps({
            'type': message['type'],
            'chat_id': message['chat_id'],
        }))