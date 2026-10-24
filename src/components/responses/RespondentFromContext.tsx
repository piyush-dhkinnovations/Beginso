'use client';

import { createContext, useContext } from 'react';

/**
 * Which question names the respondent on this page ("Respondent name comes from" in Customize), or `auto`. Provided by the one-form
 * Responses page; everywhere else (the all-forms views, other screens) it stays `auto`, so a name is detected as it always was.
 */
const RespondentFromContext = createContext<string>('auto');

export const RespondentFromProvider = RespondentFromContext.Provider;
export const useRespondentFrom = (): string => useContext(RespondentFromContext);
