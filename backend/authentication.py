# api/authentication.py
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from firebase_admin import auth
from .models import UserProfile

class FirebaseAuthentication(BaseAuthentication):
    def authenticate(self, request):
        # Get the Authorization header
        auth_header = request.headers.get('Authorization')

        if not auth_header:
            return None  # No token provided, proceed with no authentication

        # The token is expected in the format "Bearer <token>"
        try:
            id_token = auth_header.split(' ').pop()
            decoded_token = auth.verify_id_token(id_token)
        except (IndexError, auth.InvalidIdTokenError, auth.ExpiredIdTokenError) as e:
            raise AuthenticationFailed(f'Invalid or expired Firebase token: {e}')
        except Exception as e:
            # Catch any other firebase-admin errors
            raise AuthenticationFailed(f'Firebase authentication error: {e}')

        if not id_token or not decoded_token:
            return None

        # Get user data from the token
        uid = decoded_token.get('uid')
        email = decoded_token.get('email')

        # Get or create the user profile in your database
        # This is where a user is created in your Supabase DB the first time they log in
        user, created = UserProfile.objects.get_or_create(
            uid=uid,
            defaults={'email': email}
        )

        # You can update user details on every login if needed
        if not created:
            if user.email != email:
                user.email = email
                user.save()

        return (user, None) # Return the user object to be attached to request.user