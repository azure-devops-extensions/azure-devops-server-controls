/// <reference types="jquery" />

import * as BuildContracts from "TFS/Build/Contracts";

import {LinkingUtilities} from  "VSS/Artifacts/Services";
import {ToolNames} from "VSS/Artifacts/Constants";

export function getDefinitionUri(definition: BuildContracts.DefinitionReference): string {
    return definition.uri || LinkingUtilities.encodeUri({
        id: definition.id.toString(),
        tool: ToolNames.TeamBuild,
        type: "Definition"
    });
}
