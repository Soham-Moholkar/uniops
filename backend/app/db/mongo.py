"""MongoDB connection via PyMongo."""

from pymongo import MongoClient
from pymongo.database import Database
from app.config import get_settings

settings = get_settings()

_client: MongoClient = MongoClient(settings.MONGO_URI)
mongo_db: Database = _client[settings.MONGO_DB]

# Collection shortcuts
tickets_collection = mongo_db["tickets"]


def get_mongo_db() -> Database:
    """Return the MongoDB database handle."""
    return mongo_db
