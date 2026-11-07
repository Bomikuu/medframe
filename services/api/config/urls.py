from django.urls import path

from api_graphql.onboarding_views import graphql as onboarding_graphql
from api_graphql.portal_views import graphql as portal_graphql
from api_graphql.views import graphql
from config import views
from config.admin import site
from medframe_apps.organizations import staff_views
from medframe_apps.organizations import sign_in_views
from medframe_apps.operations import call_views
from medframe_apps.accounts import google_views, profile_views
from medframe_apps.dashboard import views as daily_dashboard
from medframe_apps.accounts import views as auth
from medframe_apps.accounts.session_routing import session_route
from medframe_apps.analytics.views import analytics_csv
from medframe_apps.communications.views import sms_status
from medframe_apps.diagnostics import views as diagnostics
from medframe_apps.documents import views as documents
from medframe_apps.interoperability import views as interoperability
from medframe_apps.onboarding import views as onboarding
from medframe_apps.portal import registration_views as patient_registration
from medframe_apps.portal import files as portal_files
from medframe_apps.portal import views as portal_auth
from medframe_apps.stations.patient_workspace import patient_workspace
from medframe_apps.stations import views as stations
from medframe_apps.stations.display import display as station_display
from medframe_apps.stations.kiosk_management import manage as kiosk_manage
from medframe_apps.stations.kiosk_management import portal_code
from medframe_apps.stations.kiosk_views import kiosk
from medframe_apps.websites import public as websites_public

urlpatterns = [
    path("organizations/security", sign_in_views.manage),
    path("auth/browser", sign_in_views.browser),
    path("calls/health", call_views.health),
    path("calls/rooms", call_views.rooms),
    path("calls/upload/<uuid:identifier>", call_views.upload),
    path("calls/files/<uuid:identifier>", call_views.download),
    path("staff/manage", staff_views.manage),
    path("staff/onboarding", staff_views.public),
    path("staff/photo/upload", staff_views.photo_upload),
    path("staff/photo/<uuid:identifier>", staff_views.photo_content),
    path("analytics/export", analytics_csv),
    path("interoperability/preview", interoperability.preview),
    path("interoperability/download", interoperability.download),
    path("websites/index", websites_public.index),
    path("websites/resolve", websites_public.resolve),
    path("websites/<slug:slug>", websites_public.page),
    path("websites/<slug:slug>/assets/<uuid:asset_id>", websites_public.asset),
    path("stations/display", station_display),
    path("stations/kiosk", kiosk),
    path("stations/kiosk/manage", kiosk_manage),
    path("portal/kiosk-code", portal_code),
    path("stations/context", stations.context),
    path("stations/access", stations.access),
    path("stations/doctor", stations.doctor),
    path("stations/dashboard", stations.dashboard),
    path("stations/portrait", stations.portrait),
    path("stations/patient", patient_workspace),
    path("stations/walk-in", stations.walk_in),
    path("stations/pair", stations.pair),
    path("stations/manage", stations.manage),
    path("stations/encounter", stations.encounter),
    path("stations/handoff", stations.handoff),
    path("onboarding/graphql", onboarding_graphql),
    path("onboarding/account/prepare", onboarding.prepare_account),
    path("onboarding/account/mfa/enroll", onboarding.enroll),
    path("onboarding/account/mfa/verify", onboarding.verify_mfa),
    path("onboarding/logo/upload", onboarding.upload),
    path("onboarding/logo/<uuid:identifier>/content", onboarding.logo_content),
    path("diagnostics/documents/upload/<uuid:version_id>", diagnostics.upload),
    path("diagnostics/documents/download", diagnostics.download),
    path("communications/sms/status", sms_status),
    path("portal/registration", patient_registration.public),
    path("portal/auth/invitations/google", patient_registration.google_invitation),
    path("portal/registration/manage", patient_registration.manage),
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
    path("auth/session", session_route),
    path("auth/profile", profile_views.profile),
    path("workspace/today", daily_dashboard.today),
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
