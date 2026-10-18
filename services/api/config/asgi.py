import os

from django.core.asgi import get_asgi_application

from config.body_limit import RequestBodyLimit

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")
application = RequestBodyLimit(get_asgi_application())
