# Route owner inventory — October 22 UI cleanup

Source inventory; not a claim of browser verification for every route or role.

| Route                                   | Feature owner / routing                                                                                |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| /appointments/room/[roomId]             | @/features/calls/appointment-call                                                                      |
| /auth/continue                          | @/features/auth/session-recovery                                                                       |
| /auth/recover                           | @/features/auth/auth-layout, @/features/auth/recovery-form                                             |
| /auth/reset                             | @/features/auth/auth-layout, @/features/auth/recovery-form                                             |
| /clinic/analytics                       | Server redirect / native route wrapper                                                                 |
| /clinic/appointments                    | @/features/operations/appointments                                                                     |
| /clinic/billing/[id]                    | @/features/billing/invoice-detail                                                                      |
| /clinic/billing                         | @/features/billing/billing-page                                                                        |
| /clinic/communications                  | @/features/communications/communications-page                                                          |
| /clinic/consultations/[id]              | @/features/consultations/consultation-pages                                                            |
| /clinic/consultations/new               | @/features/consultations/consultation-pages                                                            |
| /clinic/consultations                   | @/features/consultations/consultation-pages                                                            |
| /clinic/diagnostic-inbox/[id]           | @/features/diagnostics/request-detail                                                                  |
| /clinic/diagnostic-inbox                | @/features/diagnostics/request-list                                                                    |
| /clinic/diagnostics/[id]                | @/features/diagnostics/request-detail                                                                  |
| /clinic/diagnostics                     | @/features/diagnostics/request-list                                                                    |
| /clinic                                 | @/features/workspace/clinic-overview                                                                   |
| /clinic/patients/[id]/edit              | @/features/patients/patient-overview                                                                   |
| /clinic/patients/[id]/history           | @/features/patients/patient-timeline                                                                   |
| /clinic/patients/[id]                   | @/features/patients/patient-overview                                                                   |
| /clinic/patients/new                    | @/features/patients/patient-form                                                                       |
| /clinic/patients                        | @/features/patients/patient-directory                                                                  |
| /clinic/queue                           | @/features/operations/queue                                                                            |
| /clinic/services                        | @/features/services/services-page                                                                      |
| /clinic/settings/appearance             | @/features/branding/appearance-page                                                                    |
| /clinic/settings/diagnostic-centers     | @/features/diagnostics/partner-settings                                                                |
| /clinic/settings/schedules              | @/features/operations/schedules                                                                        |
| /clinic/settings/security               | @/features/security/security-page                                                                      |
| /clinic/settings/specialties            | @/features/specialties/specialty-settings                                                              |
| /clinic/settings/staff                  | @/features/staff/staff-page                                                                            |
| /clinic/settings/stations               | @/features/stations/device-management                                                                  |
| /clinic/settings/templates              | @/features/consultations/templates/template-editor                                                     |
| /clinic/settings/website                | @/features/websites/website-editor                                                                     |
| /clinic/stations                        | @/features/stations/kiosk/staff-workspace                                                              |
| /clinics/[slug]                         | @/features/websites/site-page, @/features/websites/public-url, @/features/websites/public-data         |
| /login                                  | @/features/auth/session-recovery, @/features/auth/auth-flow, @/features/auth/auth-layout               |
| /onboarding/invite/[token]              | @/features/onboarding/onboarding-flow                                                                  |
| /onboarding/notices/[kind]              | Server redirect / native route wrapper                                                                 |
| /onboarding/setup                       | @/features/onboarding/onboarding-flow                                                                  |
| /                                       | @/features/auth/session-recovery                                                                       |
| /platform/clinic-invitations            | @/features/platform/clinic-invitations                                                                 |
| /portal/appointments                    | @/features/portal/portal-provider, @/features/portal/operations/patient-operations                     |
| /portal/billing                         | @/features/portal/portal-provider, @/features/billing/portal-billing                                   |
| /portal/diagnostics/[id]                | @/features/portal/portal-provider, @/features/diagnostics/patient-diagnostics                          |
| /portal/diagnostics                     | @/features/portal/portal-provider, @/features/diagnostics/patient-diagnostics                          |
| /portal/invite                          | @/features/auth/auth-flow, @/features/portal/auth/portal-auth-layout                                   |
| /portal/login                           | @/features/auth/session-recovery, @/features/auth/auth-flow, @/features/portal/auth/portal-auth-layout |
| /portal                                 | @/features/portal/portal-provider, @/features/portal/portal-dashboard                                  |
| /portal/queue                           | @/features/portal/portal-provider, @/features/portal/operations/patient-operations                     |
| /portal/records/[id]                    | @/features/portal/portal-provider, @/features/portal/portal-dashboard                                  |
| /portal/recover                         | @/features/auth/recovery-form, @/features/portal/auth/portal-auth-layout                               |
| /portal/register/[token]                | @/features/portal/registration/registration-flow                                                       |
| /portal/reminders                       | @/features/portal/portal-provider, @/features/communications/portal-reminders                          |
| /portal/reports                         | @/features/portal/portal-provider, @/features/portal/portal-reports                                    |
| /portal/reset                           | @/features/auth/recovery-form, @/features/portal/auth/portal-auth-layout                               |
| /staff/onboarding/[token]               | @/features/staff/staff-onboarding                                                                      |
| /station/clinician/consultations/[id]   | @/features/stations/station-encounter                                                                  |
| /station/clinician                      | @/features/stations/clinician-home                                                                     |
| /station/clinician/patients/[patientId] | @/features/stations/station-patient                                                                    |
| /station/clinician/walk-in              | @/features/stations/walk-in-editor                                                                     |
| /station/display                        | @/features/stations/display/queue-display                                                              |
| /station/kiosk                          | @/features/stations/kiosk/kiosk-screen                                                                 |
| /station                                | @/features/stations/station-entry                                                                      |
