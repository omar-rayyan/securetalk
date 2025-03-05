from django.db import models
import bcrypt
import re
from datetime import datetime
from django.utils import timezone
from datetime import timedelta
from django.db.models import Q, Value
from django.db.models.functions import Concat

EMAIL_REGEX = re.compile(r'^[a-zA-Z0-9.+_-]+@[a-zA-Z0-9._-]+\.[a-zA-Z]+$')

class UserManager(models.Manager):
    def registration_validator(self, data):
        errors = {}
        if len(data['firstName']) < 2:
            errors["firstName"] = "First name should be at least 2 characters, no special characters allowed."
            return errors
        if len(data['lastName']) < 2:
            errors["lastName"] = "Last name should be at least 2 characters, no special characters allowed."
            return errors
        if len(data['email']) < 1:
            errors["email"] = "Please provide an email address."
            return errors
        if not EMAIL_REGEX.match(data['email']):
            errors["email"] = "The email address you've entered is invalid."
            return errors
        existing_email = User.objects.filter(email=data['email']).exclude(id=data.get('id'))
        if existing_email.exists():
            errors["email"] = "This email address was already used before. Please login or use a different email address."
            return errors
        if len(data['password']) < 8:
            errors["password"] = "Password should be at least 8 characters."
            return errors
        if not data['dateOfBirth']:
            errors["dateOfBirth"] = "Please select your date of birth first."
            return errors
        try:
            date_of_birth = datetime.fromisoformat(data['dateOfBirth'].rstrip("Z")).date()
        except ValueError:
            errors["dateOfBirth"] = "Invalid date format."
            return errors
        if date_of_birth > datetime.today().date():
            errors["dateOfBirth"] = "Please select a valid date of birth, as date of birth cannot be in the future."
            return errors
        if not data.get('gender'):
            errors["gender"] = "Please choose a gender first."
            return errors
        return errors
    def login_validator(self, data):
        errors = {}
        if len(data['email']) < 1:
            errors["email"] = "Please provide an email address."
            return errors
        if len(data['password']) < 1:
            errors["password"] = "Please provide a password."
            return errors
        elif not EMAIL_REGEX.match(data['email']):
            errors["email"] = "The email address you've entered is invalid."
            return errors
        else:
            user = User.objects.filter(email=data['email']).first()
            if not user:
                errors["email"] = "No user account with this email address was found."
                return errors
            else:
                if not bcrypt.checkpw(data['password'].encode(), user.password.encode()):
                    errors["password"] = "Incorrect password."
                    return errors
        return errors
    def update_data_validator(self, data):
        errors = {}
        if len(data['firstName']) < 2:
            errors["firstName"] = "First name should be at least 2 characters, no special characters allowed."
            return errors
        if len(data['lastName']) < 2:
            errors["lastName"] = "Last name should be at least 2 characters, no special characters allowed."
            return errors
        if not data['dateOfBirth']:
            errors["dateOfBirth"] = "Please select your date of birth first."
            return errors
        try:
            date_of_birth = datetime.fromisoformat(data['dateOfBirth'].rstrip("Z")).date()
        except ValueError:
            errors["dateOfBirth"] = "Invalid date format."
            return errors
        if date_of_birth > datetime.today().date():
            errors["dateOfBirth"] = "Please select a valid date of birth, as date of birth cannot be in the future."
            return errors
        return errors
    def change_password_validator(self, user, data):
        errors = {}
        if len(data['newPassword']) < 8:
            errors["newPassword"] = "New password should be at least 8 characters."
            return errors
        if not bcrypt.checkpw(data['currentPassword'].encode(), user.password.encode()):
            errors["currentPassword"] = "Current password is incorrect."
            return errors
        return errors
    def create_user(self, data):
        hashed_password = bcrypt.hashpw(data['password'].encode(), bcrypt.gensalt()).decode()
        user = User.objects.create(first_name=data['firstName'], last_name=data['lastName'], email=data['email'], password=hashed_password, date_of_birth=data['dateOfBirth'], gender=data['gender'])
        return user
    def get_user(self, id):
        return User.objects.get(id=id)
    def get_all_users(self):
        return User.objects.all()
    def get_full_name(self, user):
        return f"{user.first_name} {user.last_name}"
    def search(self, search):
        return self.annotate(
            full_name=Concat('first_name', Value(' '), 'last_name')
        ).filter(
            Q(first_name__icontains=search) |
            Q(last_name__icontains=search) |
            Q(full_name__icontains=search)
        )
    def update_user_activity(self, user):
        user.last_activity = timezone.now()
        user.save()
    def is_user_online(self, user):
        now = timezone.now()
        if user.last_activity > now - timedelta(minutes=5):
            return True
        return False
    def update_user_data(self, user, data):
        user.first_name = data['firstName']
        user.last_name = data['lastName']
        user.date_of_birth =  datetime.fromisoformat(data['dateOfBirth'].rstrip("Z")).date()
        user.gender = data['gender']
        user.save()
    def get_user_from_email(self, email):
        return User.objects.get(email=email)
    def update_user_password(self, user, new_password):
        new_hashed_password = bcrypt.hashpw(new_password.encode(), bcrypt.gensalt()).decode()
        user.password = new_hashed_password
        user.save()
    def update_profile_picture(self, user, pic):
        user.profile_picture = pic
        user.save()
    
class User(models.Model):
    first_name = models.CharField(max_length=45)
    last_name = models.CharField(max_length=45)
    profile_picture = models.CharField(default='profile_pics/default.jpg', max_length=255)
    email = models.CharField(max_length=255)
    password = models.CharField(max_length=255)
    date_of_birth = models.DateField()
    gender = models.CharField(max_length=45)
    last_activity = models.DateTimeField(default=datetime.now)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    objects = UserManager()
    def friends(self):
        from social_app.models import Friendship
        friendships = Friendship.objects.filter(models.Q(friend_1=self) | models.Q(friend_2=self))
        friends = [friendship.friend_1 if friendship.friend_2 == self else friendship.friend_2 for friendship in friendships]
        return friends
    def full_name(self):
        return f"{self.first_name} {self.last_name}"
    def is_online(self):
        now = timezone.now()
        if self.last_activity > now - timedelta(minutes=5):
            return True
        return False