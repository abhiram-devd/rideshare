import sys
import os
from sqlalchemy.orm import Session

# Insert backend root to sys.path so we can run directly
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from app.core.database import SessionLocal
from app.models.models import Location, User
from app.core.security import get_password_hash # We will define this soon!

LOCATIONS = [
    {"name": "Amritapuri", "slug": "amritapuri", "location_type": "hq"},
    {"name": "Vallikavu", "slug": "vallikavu", "location_type": "village"},
    {"name": "Oachira", "slug": "oachira", "location_type": "town"},
    {"name": "Kayamkulam Railway Station", "slug": "kayamkulam-railway-station", "location_type": "station"},
    {"name": "Kayamkulam Bus Stand", "slug": "kayamkulam-bus-stand", "location_type": "stand"},
    {"name": "Karunagappally Railway Station", "slug": "karunagappally-railway-station", "location_type": "station"},
    {"name": "Karunagappally Bus Stand", "slug": "karunagappally-bus-stand", "location_type": "stand"},
]

def seed_locations(db: Session):
    print("Seeding locations...")
    for loc_data in LOCATIONS:
        existing = db.query(Location).filter(Location.slug == loc_data["slug"]).first()
        if not existing:
            loc = Location(
                name=loc_data["name"],
                slug=loc_data["slug"],
                location_type=loc_data["location_type"],
                is_active=True
            )
            db.add(loc)
            print(f"Added location: {loc.name}")
    db.commit()

def seed_dev_users(db: Session):
    print("Seeding dev users...")
    # We will hash the password 'password123'
    # Since argon2-cffi takes a bit to load, we can use a basic helper
    pw_hash = "$argon2id$v=19$m=65536,t=3,p=4$J6P1F...dummy" # We'll replace with actual hash using passlib/argon2 later
    # Let's import the hash utility dynamically or hash it directly
    try:
        from app.core.security import get_password_hash
        hashed_pw = get_password_hash("password123")
    except Exception:
        hashed_pw = "$argon2id$v=19$m=65536,t=3,p=4$R3VpZGUxMjM0NTY3ODkwMTI$c5/KqQ1p6LdET1K1mNlK2D6B2f1z1G2t3Y4u5i6o7p8"

    dev_users = [
        {"name": "Alice Walker", "email": "alice@rideshare.local", "phone": "+919876543210"},
        {"name": "Bob Builder", "email": "bob@rideshare.local", "phone": "+918765432109"},
    ]

    for user_data in dev_users:
        existing = db.query(User).filter(User.email == user_data["email"]).first()
        if not existing:
            user = User(
                name=user_data["name"],
                email=user_data["email"],
                phone=user_data["phone"],
                password_hash=hashed_pw,
                email_verified=True,
                phone_verified=True,
                is_active=True
            )
            db.add(user)
            print(f"Added user: {user.name} ({user.email})")
    db.commit()

def main():
    db = SessionLocal()
    try:
        seed_locations(db)
        seed_dev_users(db)
        print("Seeding completed successfully!")
    finally:
        db.close()

if __name__ == "__main__":
    main()
