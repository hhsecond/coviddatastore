from celery.schedules import crontab
from lost.settings import LOST_CONFIG
from lost.logic.pipeline.worker import send_life_sign
from kombu.common import Broadcast


CELERY_IMPORTS = ('lost.logic.tasks', 'lost.api.pipeline.tasks', 'lost.api.sia.tasks')
CELERY_TASK_RESULT_EXPIRES = 30
CELERY_TIMEZONE = 'UTC'

CELERY_ACCEPT_CONTENT = ['json', 'msgpack', 'yaml']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_QUEUES = (Broadcast('worker_status'),)

CELERYBEAT_SCHEDULE = {
    'exec_pipe': {
        'task': 'lost.logic.tasks.exec_pipe',
        'schedule': int(LOST_CONFIG.pipe_schedule)
    },
    'worker_life_sign': {
        'task':  'lost.logic.pipeline.worker.send_life_sign',
        'schedule': int(LOST_CONFIG.worker_beat),
        'options': {
            'queue': 'worker_status',
            'exchange': 'worker_status'}
    }
}