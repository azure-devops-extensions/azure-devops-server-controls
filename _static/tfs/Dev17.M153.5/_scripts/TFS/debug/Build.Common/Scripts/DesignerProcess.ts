/// <reference types="jquery" />

import { ProcessType } from "Build.Common/Scripts/Generated/TFS.Build2.Common";

import * as BuildContracts from "TFS/Build/Contracts";

/**
 * Creates a new DesignerProcess
 * @param phases
 */
export function create(phases: BuildContracts.Phase[] = []): BuildContracts.DesignerProcess {
    return <BuildContracts.DesignerProcess>{
        type: ProcessType.Designer,
        phases: phases
    };
}