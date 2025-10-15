# api/authentication.py
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from firebase_admin import auth, exceptions  # <-- Add exceptions import
from .models import UserProfile
import logging  # <-- Add logging import

# Get an instance of a logger
logger = logging.getLogger(__name__)

class FirebaseAuthentication(BaseAuthentication):
    def authenticate(self, request):
        if request.method == 'OPTIONS':
            return None

        auth_header = request.headers.get('Authorization')

        if not auth_header:
            return None

        try:
            id_token = auth_header.split(' ').pop()
            # --- THE FINAL CHANGE IS HERE ---
            # Add a 30-second leeway to account for potential clock skew
            # between Vercel's server and Google's auth servers.
            decoded_token = auth.verify_id_token(id_token, clock_skew_seconds=30)
            # --- END OF CHANGE ---
        except exceptions.FirebaseError as e:
            # Catch specific Firebase errors
            logger.error(f"Firebase verification failed: {e}")
            raise AuthenticationFailed(f"Invalid Firebase token. Detail: {e}")
        except Exception as e:
            # Catch other general errors (like split failing)
            logger.error(f"A general error occurred during authentication: {e}")
            raise AuthenticationFailed("Invalid or expired Firebase token.")

        if not id_token or not decoded_token:
            return None

        uid = decoded_token.get('uid')
        email = decoded_token.get('email')

        user, created = UserProfile.objects.update_or_create(
            uid=uid,
            defaults={'email': email}
        )

        return (user, None)
