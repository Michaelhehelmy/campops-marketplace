# iCal Plugin API

> ⚠️ **Plugin-Specific API**

This plugin is **entirely hook-driven** — it exposes no HTTP endpoints.

## Events Consumed

| Hook | Listener |
|------|----------|
| `RESERVATION_AFTER_CREATE` | Generates iCal feed update |
| `RESERVATION_AFTER_CANCEL` | Updates iCal feed on cancellation |
| `ical.sync_requested` | Triggers feed sync |

## Events Emitted

| Event | Payload |
|-------|---------|
| `reservation:created` | Reservation data for external consumers |
| `reservation:cancelled` | Cancelled reservation data |
| `ical:events_fetched` | Fetched iCal event data |

Events are published via `api.publish`.
