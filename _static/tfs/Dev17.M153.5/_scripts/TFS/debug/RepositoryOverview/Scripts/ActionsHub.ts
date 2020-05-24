import { Action } from "VSS/Flux/Action";

import { ReadmeActionsHub } from "ProjectOverview/Scripts/Shared/ReadmeActionsHub";

import { RepositoryLanguageInfo } from "RepositoryOverview/Scripts/Generated/Contracts";

/**
 * A container for the current instances of the actions that can be triggered from repository overview page
 */
export class ActionsHub extends ReadmeActionsHub {
    public languagesFetched = new Action<RepositoryLanguageInfo[]>();
}
