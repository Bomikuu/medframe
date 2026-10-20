"""Pure integer schedule arithmetic; no payment records are manufactured."""

from calendar import monthrange
from dataclasses import dataclass
from datetime import date

from config.errors import DomainError


@dataclass(frozen=True)
class ScheduledAmount:
    position: int
    kind: str
    due_date: date
    amount: int
    id: str = ""


def build_schedule(total: int, deposit: int, count: int, first_due: date, deposit_due: date | None):
    if not 1 <= count <= 60 or not 0 <= deposit < total or total - deposit < count:
        raise DomainError("INVALID_INPUT", "Check the price, down payment and monthly count.")
    if deposit and (deposit_due is None or deposit_due >= first_due):
        raise DomainError("INVALID_INPUT", "First monthly payment must follow the down payment.")
    rows = [ScheduledAmount(0, "deposit", deposit_due, deposit)] if deposit else []
    regular, remainder = divmod(total - deposit, count)
    for index in range(count):
        absolute = first_due.year * 12 + first_due.month - 1 + index
        year, month = divmod(absolute, 12)
        month += 1
        if year > 9999:
            raise DomainError("INVALID_INPUT", "Choose a supported first payment date.")
        due = date(year, month, min(first_due.day, monthrange(year, month)[1]))
        rows.append(
            ScheduledAmount(
                len(rows), "monthly", due, regular + (remainder if index == count - 1 else 0)
            )
        )
    return rows


def project_obligations(rows, paid, refunded, credited, today, state):
    total = sum(row.amount for row in rows)
    cash = max(0, paid - refunded)
    charge = max(0, total - credited)
    active = state == "issued"
    remaining_credit, reductions = credited, {}
    for row in reversed(rows):
        reductions[row.position] = min(row.amount, remaining_credit)
        remaining_credit -= reductions[row.position]
    coverage = cash
    projected = []
    for row in rows:
        credit = reductions[row.position]
        effective = row.amount - credit
        covered = min(effective, coverage) if active else 0
        coverage -= covered
        remaining = effective - covered if active else 0
        projected.append(
            {
                "id": row.id,
                "position": row.position,
                "kind": row.kind,
                "due_date": row.due_date.isoformat(),
                "original": row.amount,
                "credited": credit,
                "effective": effective,
                "covered": covered,
                "remaining": remaining,
                "date_state": "overdue"
                if row.due_date < today
                else "due_today"
                if row.due_date == today
                else "upcoming",
                "coverage_state": "credited"
                if not effective
                else "paid"
                if covered == effective
                else "partial"
                if covered
                else "unpaid",
            }
        )
    due_now = sum(r["remaining"] for r in projected if r["due_date"] <= today.isoformat())
    overdue = sum(r["remaining"] for r in projected if r["due_date"] < today.isoformat())
    next_due = next((r for r in projected if r["remaining"]), None)
    return {
        "total": total,
        "credits": credited,
        "net_received": cash,
        "outstanding": max(0, charge - cash) if active else 0,
        "refundable": max(0, cash - charge) if active else 0,
        "due_now": due_now,
        "overdue": overdue,
        "future": sum(r["remaining"] for r in projected) - due_now,
        "next_due": next_due,
        "rows": projected,
    }
