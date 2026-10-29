import { terms } from "./terms";
import { privacy } from "./privacy";
import { cookiePolicy } from "./cookiePolicy";
import { acceptableUse } from "./acceptableUse";
import { fairUse } from "./fairUse";
import { dpa } from "./dpa";
import type { PolicyDoc } from "./types";

export type { PolicyDoc } from "./types";
export { terms, privacy, cookiePolicy, acceptableUse, fairUse, dpa };

/** All policy documents, in the order they should be listed (e.g. in the Footer). */
export const ALL_POLICIES: PolicyDoc[] = [terms, privacy, cookiePolicy, acceptableUse, fairUse, dpa];
