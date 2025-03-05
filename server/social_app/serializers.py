from rest_framework import serializers
from social_app.models import Chat, Message
from users_app.models import User
from users_app.serializers import UserSerializer

class ChatSerializer(serializers.ModelSerializer):
    users = UserSerializer(many=True)
    chatName = serializers.SerializerMethodField()
    contactImage = serializers.SerializerMethodField()
    createdAt = serializers.DateTimeField(source='created_at')
    updatedAt = serializers.DateTimeField(source='updated_at')

    class Meta:
        model = Chat
        fields = ['id', 'users', 'last_message', 'chatName', 'contactImage', 'createdAt', 'updatedAt']
    
    def get_chatName(self, obj):
        request = self.context.get('request')
        current_user = request.user if request else None
        
        if not current_user:
            if obj.users.all().count() == 1:
                return obj.users.first().full_name()
            else:
                return f"{obj.users.first().full_name()} and {obj.users.all()[1].full_name()}"
        
        other_users = obj.users.exclude(id=current_user.id)
        
        if not other_users.exists():
            return f"{current_user.full_name()} (You)"
        
        if other_users.count() > 1:
            first_user = other_users.first().full_name()
            return f"{first_user} and {other_users.count() - 1} others"
        
        return other_users.first().full_name()

    def get_contactImage(self, obj):
        request = self.context.get('request')
        current_user = request.user if request else None
        
        if not current_user:
            return None
        
        other_users = obj.users.exclude(id=current_user.id)
        
        if not other_users.exists():
            profile_picture_url = current_user.profile_picture
            return profile_picture_url
        
        profile_picture_url = other_users.first().profile_picture if other_users.first().profile_picture else ''
        return profile_picture_url

class MessageSerializer(serializers.ModelSerializer):
    sender = UserSerializer()
    isFromCurrentUser = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    createdAt = serializers.DateTimeField(source='created_at')
    updatedAt = serializers.DateTimeField(source='updated_at')

    class Meta:
        model = Message
        fields = ['id', 'sender', 'content', 'isFromCurrentUser', 'is_read', 'status', 'createdAt', 'updatedAt']
    
    def get_isFromCurrentUser(self, obj):
        request = self.context.get('request')
        current_user = request.user if request else None
        return obj.sender.id == current_user.id if current_user else False
    def get_status(self, obj):
        return 'read' if obj.is_read else 'sent'