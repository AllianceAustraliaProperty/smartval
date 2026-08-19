import os
import firebase_admin
from firebase_admin import credentials, auth
from pymongo import MongoClient
from dotenv import load_dotenv

# Load environment variables from backend/.env
load_dotenv()

def seed_admin():
    # Initialize Firebase
    cred = credentials.Certificate({
        "type": "service_account",
        "project_id": os.environ.get("FIREBASE_PROJECT_ID"),
        "client_email": os.environ.get("FIREBASE_CLIENT_EMAIL"),
        "private_key": os.environ.get("FIREBASE_PRIVATE_KEY", "").replace("\\n", "\n"),
        "token_uri": "https://oauth2.googleapis.com/token",
    })
    
    if not firebase_admin._apps:
        firebase_admin.initialize_app(cred)

    # Initialize MongoDB
    mongo_uri = os.environ.get("MONGO_URI")
    if not mongo_uri:
        print("Error: MONGO_URI environment variable not found.")
        return
        
    client = MongoClient(mongo_uri)
    db = client.get_default_database()

    # Admin Details
    email = "info@allianceaustraliaproperty.com.au"
    password = "Admin@123"
    username = "admin"
    name = "AAP Valuations Admin"

    print(f"Bootstrapping admin account for {email}...")

    # 1. Create in Firebase
    try:
        user = auth.create_user(email=email, password=password, display_name=name)
        print("✅ Firebase user created.")
    except Exception as e:
        if 'EMAIL_EXISTS' in str(e) or 'email-already-exists' in str(e):
            user = auth.get_user_by_email(email)
            print("✅ Firebase user already exists. Updating...")
            auth.update_user(user.uid, password=password, display_name=name)
        else:
            print(f"❌ Error creating Firebase user: {e}")
            return

    # 2. Set Admin Role
    try:
        auth.set_custom_user_claims(user.uid, {'role': 'admin'})
        print("✅ Admin role assigned in Firebase.")
    except Exception as e:
        print(f"❌ Error setting custom claims: {e}")
        return

    # 3. Save to MongoDB
    try:
        db.users.update_one(
            {"email": email},
            {"$set": {
                "firebaseUid": user.uid,
                "email": email,
                "username": username,
                "displayName": name,
                "role": "admin",
                "isActive": True
            }},
            upsert=True
        )
        print("✅ User linked and saved to MongoDB.")
    except Exception as e:
        print(f"❌ Error saving to MongoDB: {e}")
        return

    print(f"\n🎉 Success! You can now log in using:")
    print(f"   Username: {username}")
    print(f"   Email:    {email}")
    print(f"   Password: {password}")

if __name__ == "__main__":
    seed_admin()
