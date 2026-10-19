from django.urls import path

from api_graphql.onboarding_views import graphql as onboarding_graphql
from api_graphql.portal_views import graphql as portal_graphql
from api_graphql.views import graphql
from config import views
from config.admin import site
from medframe_apps.accounts import google_views
from medframe_apps.accounts import views as auth
from medframe_apps.communications.views import sms_status
from medframe_apps.diagnostics import views as diagnostics
from medframe_apps.documents import views as documents
from medframe_apps.onboarding import views as onboarding
from medframe_apps.portal import files as portal_files
from medframe_apps.portal import views as portal_auth

urlpatterns = [
    path("onboarding/graphql", onboarding_graphql),
    path("onboarding/account/prepare", onboarding.prepare_account),
    path("onboarding/account/mfa/enroll", onboarding.enroll),
    path("onboarding/account/mfa/verify", onboarding.verify_mfa),
    path("onboarding/logo/upload", onboarding.upload),
    path("onboarding/logo/<uuid:identifier>/content", onboarding.logo_content),
    path("diagnostics/documents/upload/<uuid:version_id>", diagnostics.upload),
    path("diagnostics/documents/download", diagnostics.download),
    path("communications/sms/status", sms_status),
    path("portal/graphql", portal_graphql),
    path("portal/documents/download", portal_files.download),
    path("portal/auth/csrf", auth.csrf),
    path("portal/auth/login", portal_auth.login),
    path("portal/auth/google/prepare", google_views.prepare, {"realm": "patient"}),
    path("portal/auth/google/login", google_views.login, {"realm": "patient"}),
    path("portal/auth/invitations/prepare", portal_auth.prepare),
    path("portal/auth/mfa/enroll", portal_auth.enroll),
    path("portal/auth/mfa/verify", portal_auth.verify),
    path("portal/auth/logout", auth.logout_view),
    path("portal/auth/recovery/request", portal_auth.recover),
    path("portal/auth/recovery/reset", portal_auth.reset),
    path("admin/", site.urls),
    path("graphql", graphql),
    path("health", views.health),
    path("health/ready", views.ready),
    path("auth/csrf", auth.csrf),
    path("auth/login", auth.login_view),
    path("auth/google/prepare", google_views.prepare),
    path("auth/google/login", google_views.login),
    path("auth/mfa/enroll", auth.enroll_view),
    path("auth/mfa/verify", auth.verify_view),
    path("auth/logout", auth.logout_view),
    path("auth/recovery/request", auth.recover_view),
    path("auth/recovery/reset", auth.reset_view),
    path("documents/upload/<uuid:version_id>", documents.upload),
    path("documents/download", documents.download),
]
