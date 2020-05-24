import { IDefinitionViewState } from "Build.Common/Scripts/Navigation";

import { DefinitionQueryOrder, BuildDefinitionReference } from "TFS/Build/Contracts";

import { getHistoryService } from "VSS/Navigation/Services";

export function definitionChanged(definition: BuildDefinitionReference) {
    if (definition) {
        const historyService = getHistoryService();
        let currentState: IDefinitionViewState = historyService.getCurrentState() || {};
        if (currentState.definitionId != definition.id.toString()) {
            // new definition, add state
            currentState.definitionId = definition.id.toString();
            currentState.path = definition.path;

            historyService.addHistoryPoint(currentState.action, currentState);
        }
    }
}