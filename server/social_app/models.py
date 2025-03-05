from django.db import models
from users_app.models import User

class ChatManager(models.Manager):
    def get_chat(self, chatId):
        return self.get(id=chatId)
    def create_chat(self, user1, user2):
        chat = self.create()
        chat.users.add(user1, user2)
        return chat
    def get_user_active_chats(self, user):
        return self.filter(users=user)
    def get_chat_messages(self, chatId):
        chat = self.get(id=chatId)
        return chat.chat_messages.all()
    def mark_chat_messages_as_read(self, chat, user):
        messages = chat.chat_messages.exclude(sender=user).filter(is_read=False)        
        for message in messages:
            message.is_read = True
            message.save()

class MessageManager(models.Manager):
    def create_message(self, sender, chat, content):
        chat.last_message = content
        chat.save()
        message = self.create(sender=sender, chat=chat, content=content)
        return message

class Chat(models.Model):
    users = models.ManyToManyField(User, related_name="chats")
    last_message = models.TextField(default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    objects = ChatManager()
    class Meta:
        ordering = ['created_at']

class Message(models.Model):
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name="sent_messages")
    chat = models.ForeignKey(Chat, on_delete=models.CASCADE, related_name="chat_messages")
    content = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    objects = MessageManager()
    class Meta:
        ordering = ['created_at']