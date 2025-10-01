from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from app.db.supabase_client import supabase
from app.core.security import get_password_hash, verify_password, create_access_token
from app.models.pydantic_models import UserCreate, Token

router = APIRouter()

@router.post("/register", status_code=status.HTTP_201_CREATED)
def register_user(user: UserCreate):
    # Check if user already exists
    existing_user = supabase.table("users").select("id").eq("email", user.email).execute()
    if existing_user.data:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_password = get_password_hash(user.password)
    new_user = {
        "email": user.email,
        "hashed_password": hashed_password,
        "full_name": user.full_name,
        "role": user.role
    }
    
    response = supabase.table("users").insert(new_user).execute()
    if response.data:
        return {"message": "User registered successfully"}
    
    raise HTTPException(status_code=500, detail="Could not register user")


@router.post("/token", response_model=Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    response = supabase.table("users").select("*").eq("email", form_data.username).execute()
    if not response.data:
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    user = response.data[0]
    if not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(status_code=400, detail="Incorrect email or password")

    access_token = create_access_token(data={"sub": user["email"]})

    user_info = {
        "id": user["id"],
        "email": user["email"],
        "full_name": user["full_name"],
        "role": user["role"]
    }
    
    return {"access_token": access_token, "token_type": "bearer", "user_info": user_info}