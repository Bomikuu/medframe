import csv
import io
import re

from config.errors import DomainError
from medframe_apps.analytics.queries import clinic_insights
from medframe_apps.auditing.services import audit
from medframe_apps.billing.analytics import financial_overview


def safe_cell(value):
    text = str(value)
    if re.fullmatch(r"-?\d+(?:\.\d+)?", text):
        return text
    dangerous = text.startswith(("\t", "\r", "\n")) or text.lstrip().startswith(
        ("=", "+", "-", "@")
    )
    return "'" + text if dangerous else text


def render_csv(
    request, organization_id, branch_id, days, sections, *, start_date=None, end_date=None
):
    if (
        not isinstance(sections, list)
        or not sections
        or len(sections) > 3
        or any(s not in {"operations", "clinical", "finance"} for s in sections)
        or len(set(sections)) != len(sections)
    ):
        raise DomainError("INVALID_INPUT", "Choose supported report sections.")
    data = clinic_insights(
        request, organization_id, branch_id, days, start_date=start_date, end_date=end_date
    )
    rows = [["Section", "Metric", "Period or category", "Value", "Currency"]]
    rows.extend(
        [
            ["Report", key, "", data[key], ""]
            for key in (
                "branch",
                "timezone",
                "current_from",
                "current_to",
                "previous_from",
                "previous_to",
                "as_of",
            )
        ]
    )
    for section in sections:
        if section == "finance":
            finance = financial_overview(
                request,
                organization_id,
                branch_id,
                start_date=data["current_from"],
                end_date=data["current_to"],
            )
            for currency in finance["currencies"]:
                for period in ("current", "previous"):
                    for key, amount in currency[period].items():
                        rows.append([section, key, period, amount, currency["currency"]])
                for key in ("outstanding", "due_now", "overdue", "future"):
                    rows.append(
                        [section, key, "Current snapshot", currency[key], currency["currency"]]
                    )
                for point in currency["series"]:
                    for key in ("issued", "payments", "refunds", "net"):
                        rows.append([section, key, point["date"], point[key], currency["currency"]])
            continue
        value = data[section]
        if value is None:
            raise DomainError("FORBIDDEN", "This report section is unavailable.", 403)
        for metric, summary in value.items():
            if metric == "specialties":
                rows.extend(
                    [
                        [section, "Current specialty workload", r["label"], r["count"], ""]
                        for r in summary
                    ]
                )
                continue
            for key in ("current", "previous", "distinct_current", "distinct_previous"):
                if key in summary:
                    rows.append([section, metric, key, summary[key], ""])
            rows.extend(
                [
                    [section, metric + " current status", r["label"], r["count"], ""]
                    for r in summary["statuses"]
                ]
            )
            rows.extend([[section, metric, r["date"], r["count"], ""] for r in summary["series"]])
    output = io.StringIO(newline="")
    csv.writer(output).writerows([[safe_cell(cell) for cell in row] for row in rows])
    audit(request.user, f"analytics.export.{data['days']}", organization_id, branch_id)
    return output.getvalue()
