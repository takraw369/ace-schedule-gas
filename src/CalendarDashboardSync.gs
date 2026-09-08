/**
 * CalendarDashboardSync.gs
 * Google Calendar (source of truth) -> private MASA Dashboard snapshot.
 *
 * Required Script Property:
 *   CALENDAR_SYNC_SECRET = same secret configured on the masahiroyamada.com Worker
 *
 * The snapshot is display-only. Google Calendar remains canonical.
 */

var CALENDAR_DASHBOARD_SYNC_URL = 'https://masahiroyamada.com/api/dashboard/calendar/sync';
var CALENDAR_SYNC_HANDLER = 'syncCalendarToDashboard';

/**
 * Push a rolling calendar window to the private Dashboard.
 * Window: yesterday 00:00 JST -> +60 days 23:59:59 JST.
 */
function syncCalendarToDashboard() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) {
    Logger.log('Calendar dashboard sync skipped: another sync is already running.');
    return { ok: false, skipped: 'sync_already_running' };
  }

  try {
    var secret = PropertiesService.getScriptProperties().getProperty('CALENDAR_SYNC_SECRET');
    if (!secret) {
      throw new Error('CALENDAR_SYNC_SECRET is not configured in Script Properties.');
    }

    var calendar = CalendarApp.getDefaultCalendar();
    var now = new Date();
    var windowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
    var windowEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 61, 0, 0, 0, 0);
    var sourceEvents = calendar.getEvents(windowStart, windowEnd);

    var events = sourceEvents.map(function(event) {
      var start = event.getStartTime();
      var end = event.getEndTime();
      // CalendarApp recurring instances can share the series iCal UID. Include the
      // occurrence start so each instance has a stable key inside this snapshot.
      var eventId = event.getId() + '|' + start.toISOString();

      return {
        event_id: eventId,
        calendar_id: 'primary',
        title: event.getTitle() || '(no title)',
        start_at: start.toISOString(),
        end_at: end.toISOString(),
        all_day: event.isAllDayEvent(),
        location: event.getLocation() || null
      };
    });

    var payload = {
      source_synced_at: now.toISOString(),
      window_start: windowStart.toISOString(),
      window_end: windowEnd.toISOString(),
      events: events
    };

    var response = UrlFetchApp.fetch(CALENDAR_DASHBOARD_SYNC_URL, {
      method: 'post',
      contentType: 'application/json',
      headers: {
        Authorization: 'Bearer ' + secret
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    var code = response.getResponseCode();
    if (code === 409) {
      Logger.log('Calendar dashboard sync skipped: a newer snapshot already won.');
      return { ok: false, skipped: 'stale_snapshot' };
    }
    if (code < 200 || code >= 300) {
      throw new Error('Calendar dashboard sync failed: HTTP ' + code + ' / ' + response.getContentText().slice(0, 500));
    }

    Logger.log('Calendar dashboard sync complete: ' + events.length + ' events');
    return JSON.parse(response.getContentText());
  } finally {
    lock.releaseLock();
  }
}

/**
 * Install only this feature's 15-minute trigger.
 * Existing triggers for other ACE Schedule functions are preserved.
 */
function setupCalendarDashboardTrigger() {
  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    if (trigger.getHandlerFunction() === CALENDAR_SYNC_HANDLER) {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  ScriptApp.newTrigger(CALENDAR_SYNC_HANDLER)
    .timeBased()
    .everyMinutes(15)
    .create();

  Logger.log('Calendar dashboard trigger installed: every 15 minutes');
}

/**
 * Remove only the private Calendar Dashboard sync trigger.
 */
function removeCalendarDashboardTrigger() {
  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    if (trigger.getHandlerFunction() === CALENDAR_SYNC_HANDLER) {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  Logger.log('Calendar dashboard trigger removed');
}
