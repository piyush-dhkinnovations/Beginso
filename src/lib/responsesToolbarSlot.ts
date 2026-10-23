/**
 * The empty spot in the Responses filter bar, after Search / Assignee / Show, where the calendar puts its own controls (Today,
 * previous / next, the month) so they share the bar's row instead of taking a row of their own. ResponsesToolbar renders it only
 * in the calendar view; ResponsesCalendar portals into it when it is there and renders them in place when it is not.
 */
export const RESPONSES_TOOLBAR_SLOT_ID = 'responses-toolbar-slot';
