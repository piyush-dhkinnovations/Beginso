/**
 * Empty spots in a form's data header where a page puts its own controls, so the header stays two compact rows and the page adds no
 * row of buttons of its own. FormDataHeader renders them; the Responses page and the Insights page portal into them.
 *
 *   row 1: breadcrumb, title, status ........ [HEADER: Export] [Edit] [HEADER_END: Customize]
 *   row 2: [Insights | Responses] ........... [SUBHEADER: Responses count + Table / Board / Calendar, or Insights Filters + Add chart]
 */
/** The builder from 1024px: its header goes in the top bar, its save state in the middle of the tabs strip. */
export const BUILDER_HEADER_SLOT_ID = 'builder-header-slot';
export const BUILDER_SAVE_SLOT_ID = 'builder-save-slot';
export const FORM_HEADER_SLOT_ID = 'form-data-header-slot';
export const FORM_HEADER_END_SLOT_ID = 'form-data-header-end-slot';
export const FORM_SUBHEADER_SLOT_ID = 'form-data-subheader-slot';
