from users_app.models import User
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
import jwt
import datetime
import pytz
import json
from users_app.serializers import UserSerializer
from users_app.authentication import authenticate
import cloudinary
import cloudinary.uploader
from cloudinary.utils import cloudinary_url

SECRET_KEY = settings.SECRET_KEY
palestine_tz = pytz.timezone('Asia/Hebron')

cloudinary.config( 
    cloud_name = "dowuigpg4", 
    api_key = "994269655154433", 
    api_secret = "b_QAsrw0KqwWwKM0_qAJFBxbEwU",
    secure=True
)

@csrf_exempt
def register(request):
    data = json.loads(request.body)
    errors = User.objects.registration_validator(data)
    if errors:
        return JsonResponse({"message": "Validation errors", "errors": errors}, status=400)
    user = User.objects.create_user(data)

    # Create JWT token with user ID
    payload = {
        'user_id': user.id,
        'exp': datetime.datetime.now(palestine_tz) + datetime.timedelta(days=14),  # Set expiration to 14 days
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm='HS256')

    # Return the token in the response body
    return JsonResponse({"message": "User registered successfully", "token": token}, status=200)

@csrf_exempt
def login(request):
    data = json.loads(request.body)
    errors = User.objects.login_validator(data)
    if errors:
        return JsonResponse({"message": "Validation errors", "errors": errors}, status=400)
    user = User.objects.get_user_from_email(data["email"])
    payload = {
        'user_id': user.id,
        'exp': datetime.datetime.now(palestine_tz) + datetime.timedelta(days=14),  # Set expiration to 14 days
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm='HS256')

    # Return the token in the response body
    return JsonResponse({"message": "User logged in successfully", "token": token}, status=200)

@csrf_exempt
@authenticate
def logout(request):
    return JsonResponse({"message": "User logged out successfully"}, status=200)

@csrf_exempt
@authenticate
def get_user_details(request):
    try:
        user = request.user
        serializer = UserSerializer(user)
        return JsonResponse(serializer.data, status=200)
    except Exception as e:
        print(e)
        return JsonResponse({"message": str(e)}, status=500)

@csrf_exempt
@authenticate
def update_profile(request):
    try:
        data = json.loads(request.body)
        user = request.user
        errors = User.objects.update_data_validator(data)
        if errors:
            return JsonResponse({"message": "Validation errors", "errors": errors}, status=400)
        user = User.objects.update_user_data(user, data)
        serializer = UserSerializer(user)
        return JsonResponse(serializer.data, status=200)
    except Exception as e:
        print(e)
        return JsonResponse({"message": str(e)}, status=500)

@csrf_exempt
@authenticate
def upload_profile_pic(request):
    try:
        user = request.user
        if 'file' not in request.FILES:
            return JsonResponse({"message": "No file provided"}, status=400)
        
        file = request.FILES['file']
        
        upload_result = cloudinary.uploader.upload(file)
        file_url = upload_result.get("secure_url")
        
        auto_crop_url, _ = cloudinary_url(file_url, width=500, height=500, crop="fill", gravity="auto")
        
        User.objects.update_profile_picture(user, auto_crop_url)
        return JsonResponse({"imageUrl": auto_crop_url}, status=200)
    except Exception as e:
        print(e)
        return JsonResponse({"message": str(e)}, status=500)

@csrf_exempt
@authenticate
def change_password(request):
    try:
        data = json.loads(request.body)
        user = request.user
        errors = User.objects.change_password_validator(user, data)
        if errors:
            return JsonResponse({"message": "Validation errors", "errors": errors}, status=400)
        User.objects.update_user_password(user, data["newPassword"])
        return JsonResponse({"message": "Password updated successfully"}, status=200)
    except Exception as e:
        print(e)
        return JsonResponse({"message": str(e)}, status=500)