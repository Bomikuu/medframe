from django.db import migrations


def capture_existing_plans(apps, schema_editor):
    Plan = apps.get_model("treatments", "TreatmentPlan")
    Revision = apps.get_model("treatments", "TreatmentPlanRevision")
    Event = apps.get_model("treatments", "TreatmentPlanEvent")
    for plan in Plan.objects.iterator():
        event = Event.objects.filter(plan_id=plan.id).order_by("-version", "-created_at").first()
        items = [
            {
                "id": str(item.id),
                "position": item.position,
                "description": item.description,
                "tooth": item.tooth,
                "status": item.status,
                "completed_revision_id": str(item.completed_revision_id)
                if item.completed_revision_id
                else None,
            }
            for item in plan.items.order_by("position")
        ]
        active = [item for item in items if item["status"] != "cancelled"]
        Revision.objects.create(
            plan_id=plan.id,
            version=plan.version,
            actor_id=event.actor_id if event else plan.created_by_id,
            provenance="migration_snapshot",
            snapshot={
                "id": str(plan.id),
                "title": plan.title,
                "version": plan.version,
                "items": items,
                "completed": sum(item["status"] == "completed" for item in active),
                "active_total": len(active),
            },
        )


SQL = """
ALTER TABLE treatments_treatmentplan ADD CONSTRAINT plan_id_patient_org
UNIQUE(id,patient_id,organization_id);
ALTER TABLE treatments_followup ADD CONSTRAINT followup_patient_org
FOREIGN KEY(patient_id,organization_id) REFERENCES patients_patient(id,organization_id);
ALTER TABLE treatments_followup ADD CONSTRAINT followup_plan_patient_org
FOREIGN KEY(plan_id,patient_id,organization_id) REFERENCES
treatments_treatmentplan(id,patient_id,organization_id);
ALTER TABLE treatments_followup ADD CONSTRAINT followup_state CHECK(status IN
('open','completed','cancelled') AND version > 0);
CREATE TRIGGER immutable_record BEFORE UPDATE OR DELETE ON treatments_treatmentplanrevision
FOR EACH ROW EXECUTE FUNCTION medframe_immutable();
CREATE TRIGGER immutable_record BEFORE UPDATE OR DELETE ON treatments_followuprevision
FOR EACH ROW EXECUTE FUNCTION medframe_immutable();
CREATE TRIGGER immutable_record BEFORE UPDATE OR DELETE ON auditing_requestreceipt
FOR EACH ROW EXECUTE FUNCTION medframe_immutable();
CREATE FUNCTION medframe_completed_item_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD.completed_revision_id IS NOT NULL THEN
   IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Completed treatment evidence is immutable'; END IF;
   IF (NEW.description,NEW.status,NEW.tooth,NEW.completed_revision_id,NEW.plan_id)
      IS DISTINCT FROM (OLD.description,OLD.status,OLD.tooth,OLD.completed_revision_id,OLD.plan_id)
   THEN RAISE EXCEPTION 'Completed treatment evidence is immutable'; END IF;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER completed_item_guard BEFORE UPDATE OR DELETE ON treatments_treatmentplanitem
FOR EACH ROW EXECUTE FUNCTION medframe_completed_item_guard();
"""
REVERSE = """
DROP TRIGGER completed_item_guard ON treatments_treatmentplanitem;
DROP FUNCTION medframe_completed_item_guard();
DROP TRIGGER immutable_record ON auditing_requestreceipt;
DROP TRIGGER immutable_record ON treatments_followuprevision;
DROP TRIGGER immutable_record ON treatments_treatmentplanrevision;
ALTER TABLE treatments_followup DROP CONSTRAINT followup_state, DROP CONSTRAINT
followup_plan_patient_org, DROP CONSTRAINT followup_patient_org;
ALTER TABLE treatments_treatmentplan DROP CONSTRAINT plan_id_patient_org;
"""


class Migration(migrations.Migration):
    dependencies = [
        ("treatments", "0002_followup_followuprevision_treatmentplanrevision_and_more"),
        ("auditing", "0003_requestreceipt"),
        ("encounters", "0002_integrity"),
    ]
    operations = [
        migrations.RunPython(capture_existing_plans, migrations.RunPython.noop),
        migrations.RunSQL(SQL, REVERSE),
    ]
