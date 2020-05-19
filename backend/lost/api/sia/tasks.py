from flaskapp import celery
import hangar
from pathlib import Path


@celery.task
def upload_hangar(identity):
    path = Path('/home/lost/') / str(identity)
    repo = hangar.Repository(path)
    
