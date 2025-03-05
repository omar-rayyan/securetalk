from functools import wraps
from django.http import JsonResponse
import jwt
from django.conf import settings
from users_app.models import User

def authenticate(view_func):
    """
    Authentication decorator for Django views.
    
    This decorator checks for JWT token authentication in:
    1. Request cookies (for browser clients)
    2. Authorization header (for API/mobile clients)
    
    It decodes the token, verifies it, and attaches the user object to the request.
    If authentication fails, it returns an error response.
    """
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        try:
            # First check for token in cookies
            token = request.COOKIES.get('user_token')
            
            # If not in cookies, check Authorization header
            if not token:
                auth_header = request.headers.get('Authorization')
                if auth_header and auth_header.startswith('Bearer '):
                    token = auth_header.split(' ')[1]
            
            if not token:
                return JsonResponse({
                    "message": "Authentication failed",
                    "error": "No token provided"
                }, status=401)
            
            try:
                # Decode the token
                payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
                user_id = payload.get('user_id')
                
                # Get the user and attach both user and user_id to request
                user = User.objects.get(id=user_id)
                request.user = user
                request.user_id = user_id
                
                return view_func(request, *args, **kwargs)
                
            except jwt.ExpiredSignatureError:
                response = JsonResponse({
                    "message": "Authentication failed",
                    "error": "Token has expired"
                }, status=401)
                response.delete_cookie('user_token')
                return response
                
            except jwt.InvalidTokenError:
                response = JsonResponse({
                    "message": "Authentication failed",
                    "error": "Invalid token"
                }, status=401)
                response.delete_cookie('user_token')
                return response
                
            except User.DoesNotExist:
                response = JsonResponse({
                    "message": "Authentication failed",
                    "error": "User not found"
                }, status=401)
                response.delete_cookie('user_token')
                return response
                
        except Exception as e:
            response = JsonResponse({
                "message": "Authentication failed",
                "error": str(e)
            }, status=401)
            response.delete_cookie('user_token')
            return response
    
    return wrapper