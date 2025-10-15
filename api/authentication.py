# api/authentication.py
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from firebase_admin import auth
from .models import UserProfile

class FirebaseAuthentication(BaseAuthentication):
    def authenticate(self, request):
        if request.method == 'OPTIONS':
            return None

        auth_header = request.headers.get('Authorization')

        if not auth_header:
            return None

        try:
            id_token = auth_header.split(' ').pop()
            decoded_token = auth.verify_id_token(id_token)
        except Exception as e:
            raise AuthenticationFailed('Invalid or expired Firebase token.')

        if not id_token or not decoded_token:
            return None

        uid = decoded_token.get('uid')
        email = decoded_token.get('email')

        user, created = UserProfile.objects.update_or_create(
            uid=uid,
            defaults={'email': email}
        )

        return (user, None)