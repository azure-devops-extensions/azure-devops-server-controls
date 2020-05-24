import { DefaultRepositorySource } from "CIWorkflow/Scripts/Scenarios/Definition/Sources/DefaultRepositorySource";

import * as RegexConstants from "DistributedTaskControls/Common/RegexConstants";

import { DefinitionQuality } from "TFS/Build/Contracts";
import { ProjectVisibility } from "TFS/Core/Contracts";

export class DefinitionUtils{

    public static isDraftDefinition(quality: DefinitionQuality) {
        return quality === DefinitionQuality.Draft;
    }

    public static isDefinitionNameValid(definitionName: string): boolean {
        if (!definitionName || RegexConstants.DefinitionNameRegex.test(definitionName)) {
            return false;
        }
        return true;
    }

    public static IsThereVisibilityConflict(definitionProjectId: string, repositoryProjectId: string): boolean {
        const currentProjectVisibility = definitionProjectId ? DefaultRepositorySource.instance().getProjectVisibility(definitionProjectId) : undefined; 
        const sourcesProjectVisibility = repositoryProjectId ? DefaultRepositorySource.instance().getProjectVisibility(repositoryProjectId) : undefined;
        return sourcesProjectVisibility != undefined && currentProjectVisibility != undefined && currentProjectVisibility !== sourcesProjectVisibility && sourcesProjectVisibility === ProjectVisibility.Private;
    }
}

export interface IDefinitionInfo {
    id: number;
    rev: number;
}