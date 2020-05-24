import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import * as ReleaseContracts from "ReleaseManagement/Core/Contracts";

import * as Utils_String from "VSS/Utils/String";


export class ReleaseDetailsViewHelper {

    public static getReleaseStatusText(status: ReleaseContracts.ReleaseStatus): string {

        let releaseStatusText: string = Utils_String.empty;
        switch (status) {
            case ReleaseContracts.ReleaseStatus.Active:
                releaseStatusText = Utils_String.empty;
                break;
            case ReleaseContracts.ReleaseStatus.Abandoned:
                releaseStatusText = Resources.AbandonText;
                break;
            case ReleaseContracts.ReleaseStatus.Draft:
                releaseStatusText = Resources.DraftText;
                break;
        }
        return releaseStatusText;
    }
}