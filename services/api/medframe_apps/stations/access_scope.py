"""An allowlisted clinical slice for delegated Station sessions; full staff is unchanged."""

from graphql import parse
from graphql.language.ast import (
    FieldNode,
    FragmentDefinitionNode,
    FragmentSpreadNode,
    InlineFragmentNode,
    OperationDefinitionNode,
)
from graphql.utilities import value_from_ast_untyped

from config.errors import DomainError
from medframe_apps.stations.context import current_request

PERMISSIONS = {
    "workspace.read",
    "patients.demographics.read",
    "patients.clinical.read",
    "patients.clinical.write",
    "encounters.write",
    "documents.write",
}
QUERIES = {
    "currentUser",
    "myOrganizations",
    "clinicWorkspace",
    "clinicAppearance",
    "encounter",
    "patientDemographics",
    "patientClinicalContext",
    "patientClinicalHistory",
    "dentalReference",
    "dentalChart",
    "toothHistory",
    "anatomyChart",
    "anatomyRevisions",
    "anatomyComparison",
    "treatmentPlans",
    "patientDocuments",
    "documentRecords",
    "recordAuthors",
    "exactDocumentVersions",
    "documents",
    "documentVersions",
}
MUTATIONS = {
    "updateEncounterDraft",
    "transitionEncounter",
    "finalizeEncounter",
    "createEncounterAmendment",
    "beginDocumentUpload",
    "authorizeDocumentDownload",
    "retryDocumentScan",
}


def scope():
    request = current_request.get()
    return getattr(request, "station_access", None) if request else None


def deny():
    raise DomainError(
        "STATION_SCOPE",
        "This code opens only its assigned consultation. Use your own workstation for other tasks.",
        403,
    )


def check_permission(organization_id, permission):
    access = scope()
    if access and (
        str(organization_id) != str(access.handoff.encounter.organization_id)
        or permission not in PERMISSIONS
    ):
        deny()


def check_encounter(encounter_id):
    access = scope()
    if access and str(encounter_id) != str(access.handoff.encounter_id):
        deny()


def permissions(values):
    return set(values) & PERMISSIONS if scope() else values


def validate_graphql(request, query, variables):
    access = getattr(request, "station_access", None)
    if not access:
        return
    # Ordinary query limits execute first; do not invent a second permissive parser.
    document = parse(query, max_tokens=2000)
    fragments = {
        d.name.value: d for d in document.definitions if isinstance(d, FragmentDefinitionNode)
    }
    operation = next(d for d in document.definitions if isinstance(d, OperationDefinitionNode))
    allowed = QUERIES if operation.operation.value == "query" else MUTATIONS
    encounter = access.handoff.encounter

    def roots(selection, visited=frozenset()):
        for node in selection.selections:
            if isinstance(node, FieldNode):
                yield node
            elif isinstance(node, InlineFragmentNode):
                yield from roots(node.selection_set, visited)
            elif isinstance(node, FragmentSpreadNode):
                name = node.name.value
                if name in visited or name not in fragments:
                    deny()
                yield from roots(fragments[name].selection_set, visited | {name})

    for field in roots(operation.selection_set):
        name = field.name.value
        if name not in allowed:
            deny()
        args = {
            a.name.value: value_from_ast_untyped(a.value, variables or {})
            for a in (field.arguments or ())
        }
        for key, expected in {
            "organizationId": encounter.organization_id,
            "patientId": encounter.patient_id,
            "encounterId": encounter.id,
        }.items():
            if key in args and args[key] is not None and str(args[key]) != str(expected):
                deny()
        if name == "beginDocumentUpload" and (
            str(args.get("encounterId")) != str(encounter.id)
            or str(args.get("patientId")) != str(encounter.patient_id)
            or args.get("purpose") != "clinical"
        ):
            deny()
