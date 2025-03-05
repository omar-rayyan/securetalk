from rest_framework import serializers
from users_app.models import User

class UserSerializer(serializers.ModelSerializer):
    fullName = serializers.CharField(source='full_name')

    class Meta:
        model = User
        fields = ['id', 'fullName', 'profile_picture', 'first_name', 'last_name', 'email', 'date_of_birth', 'gender']