import type { Ticket } from "./types";

/** An isolated print document: no surrounding patient identity, bills or form fields. */
export function printTicket(ticket: Ticket, timezone: string) {
  document.querySelector("iframe[data-service-ticket-print]")?.remove();
  const frame = document.createElement("iframe");
  frame.title = "Service ticket print";
  frame.dataset.serviceTicketPrint = "true";
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0";
  document.body.append(frame);
  const target = frame.contentDocument;
  const view = frame.contentWindow;
  if (!target || !view) {
    frame.remove();
    return;
  }
  target.title = `Queue ticket ${ticket.label}`;
  const style = target.createElement("style");
  style.textContent =
    "@page{size:80mm 150mm;margin:7mm}body{margin:0;color:#102a43;background:white;font:14px/1.5 Arial,sans-serif}h1{font-size:48px;margin:16px 0;line-height:1.1;overflow-wrap:anywhere}h2{font-size:18px;margin:0 0 8px}p{margin:8px 0}.small{font-size:11px;color:#475569}hr{border:0;border-top:1px dashed #94a3b8;margin:16px 0}";
  target.head.append(style);
  const add = (tag: string, text: string, small = false) => {
    const node = target.createElement(tag);
    node.textContent = text;
    if (small) node.className = "small";
    target.body.append(node);
  };
  add("h2", "Clinic service ticket");
  add("h1", ticket.label);
  add("p", ticket.department);
  if (ticket.counter) add("p", ticket.counter);
  if (ticket.provider) add("p", ticket.provider);
  add(
    "p",
    new Intl.DateTimeFormat(undefined, {
      timeZone: timezone,
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(ticket.issued_at)),
    true,
  );
  target.body.append(target.createElement("hr"));
  add("p", ticket.next_step);
  add("p", "Keep this number and follow clinic staff instructions.", true);
  view.focus();
  view.print();
}
