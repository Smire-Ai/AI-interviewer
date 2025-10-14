# api/authentication.py
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from firebase_admin import auth
from .models import UserProfile

class FirebaseAuthentication(BaseAuthentication):
    def authenticate(self, request):
        # --- ADD THIS CHECK ---
        # Don't authenticate OPTIONS requests.
        # This is crucial for the CORS preflight check to succeed.
        if request.method == 'OPTIONS':
            return None
        # --- END OF ADDED CHECK ---

        auth_header = request.headers.get('Authorization')

        if not auth_header:
            return None

        try:
            id_token = auth_header.split(' ').pop()
            decoded_token = auth.verify_id_token(id_token)
        except Exception as e:
            # Be more specific with error logging if possible
            # print(f"Firebase auth error: {e}")
            raise AuthenticationFailed('Invalid or expired Firebase token.')

        if not id_token or not decoded_token:
            return None

        uid = decoded_token.get('uid')
        email = decoded_token.get('email')

        # Use update_or_create for efficiency and to handle changes in user data from Firebase
        user, created = UserProfile.objects.update_or_create(
            uid=uid,
            defaults={'email': email}
        )

        return (user, None)