from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json
from users_app.authentication import authenticate
from users_app.models import User
from users_app.serializers import *
from social_app.serializers import *
from social_app.models import Chat

@csrf_exempt
@authenticate
def get_contacts(request):
    try:
        users = User.objects.get_all_users()
        serializer = UserSerializer(users, many=True)
        return JsonResponse({'users': serializer.data}, status=200)
    except Exception as e:
        print(f"Error in get_contacts: {str(e)}")
        return JsonResponse({'error': 'Failed to fetch users'}, status=500)

@csrf_exempt
@authenticate
def get_chats(request):
    try:
        user = User.objects.get_user(request.user_id)
        chats = Chat.objects.get_user_active_chats(user)
        serializer = ChatSerializer(chats, many=True, context={'request': request})
        return JsonResponse({'chats': serializer.data}, status=200)
    except Exception as e:
        print(f"Error in get_chats: {str(e)}")
        return JsonResponse({'error': 'Failed to fetch chats'}, status=500)

@csrf_exempt
@authenticate
def create_chat(request):
    try:
        data = json.loads(request.body)
        contact_id = data.get('contactId')
        
        if not contact_id:
            return JsonResponse({'error': 'Contact ID is required'}, status=400)
            
        user = request.user
        contact = User.objects.get(id=contact_id)
        
        # Check if a chat already exists between these users
        existing_chats = Chat.objects.filter(users=user).filter(users=contact)
        
        if existing_chats.exists():
            # Return the existing chat
            chat = existing_chats.first()
            serializer = ChatSerializer(chat, context={'request': request})
            return JsonResponse({
                'message': 'Chat already exists', 
                'chat': serializer.data, 
                'isNew': False
            }, status=200)
        
        # Create a new chat
        chat = Chat.objects.create_chat(contact, user)
        serializer = ChatSerializer(chat, context={'request': request})
        
        return JsonResponse({
            'message': 'Chat created successfully', 
            'chat': serializer.data,
            'isNew': True
        }, status=201)
        
    except User.DoesNotExist:
        return JsonResponse({'error': 'User not found'}, status=404)
    except Exception as e:
        print(f"Error in create_chat: {str(e)}")
        return JsonResponse({'error': f'Failed to create chat: {str(e)}'}, status=500)
    
@csrf_exempt
@authenticate
def get_chat_messages(request, chat_id):
    try:
        messages = Chat.objects.get_chat_messages(chat_id)
        serializer = MessageSerializer(messages, many=True, context={'request': request})
        return JsonResponse({'messages': serializer.data}, status=200)
    except Chat.DoesNotExist:
        return JsonResponse({'error': 'Chat not found'}, status=404)
    except Exception as e:
        print(f"Error in get_chat_messages: {str(e)}")
        return JsonResponse({'error': 'Failed to fetch messages'}, status=500)

@csrf_exempt
@authenticate
def mark_chat_messages_as_read(request, chat_id):
    try:
        user = request.user
        chat = Chat.objects.get_chat(chat_id)
        Chat.objects.mark_chat_messages_as_read(chat, user)
        return JsonResponse({'message': 'Messages marked as read'}, status=200)
    except Chat.DoesNotExist:
        return JsonResponse({'error': 'Chat not found'}, status=404)
    except Exception as e:
        print(f"Error in mark_chat_messages_as_read: {str(e)}")
        return JsonResponse({'error': 'Failed to mark messages as read'}, status=500)

@csrf_exempt
@authenticate
def create_chat_message(request, chat_id):
    try:
        data = json.loads(request.body)
        content = data.get('content')
        
        if not content:
            return JsonResponse({'error': 'Message content is required'}, status=400)
        
        user = request.user
        chat = Chat.objects.get_chat(chat_id)
        
        message = Message.objects.create_message(user, chat, content)
        serializer = MessageSerializer(message, context={'request': request})
        
        return JsonResponse({'message': serializer.data}, status=201)
        
    except Chat.DoesNotExist:
        return JsonResponse({'error': 'Chat not found'}, status=404)
    except Exception as e:
        print(f"Error in create_chat_message: {str(e)}")
        return JsonResponse({'error': 'Failed to create message'}, status=500)