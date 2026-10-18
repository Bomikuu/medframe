from django.urls import path

from api_graphql.views import graphql
from config import views
from config.admin import site
from medframe_apps.accounts import views as auth
from medframe_apps.documents import views as documents

urlpatterns = [
    path("admin/", site.urls),
    path("graphql", graphql),
    path("health", views.health),
    path("health/ready", views.ready),
    path("auth/csrf", auth.csrf),
    path("auth/login", auth.login_view),
    path("auth/mfa/enroll", auth.enroll_view),
    path("auth/mfa/verify", auth.verify_view),
    path("auth/logout", auth.logout_view),
    path("auth/recovery/request", auth.recover_view),
    path("auth/recovery/reset", auth.reset_view),
    path("documents/upload/<uuid:version_id>", documents.upload),
    path("documents/download", documents.download),
]
