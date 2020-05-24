import Utils_String = require("VSS/Utils/String");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Contracts_Platform = require("VSS/Common/Contracts/Platform");
import Artifacts_Constants = require("VSS/Artifacts/Constants");
import Artifacts_Services = require("VSS/Artifacts/Services");
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import * as VersionControlUrls from "VersionControl/Scripts/VersionControlUrls";
import {ChangeListType} from "VersionControl/Scripts/ChangeListType";

export class ChangesetArtifact extends Artifacts_Services.Artifact {

    constructor (data: any) {
        /// <summary> Decodes changeset details of an artifact URI like:
        /// vstfs:///VersionControl/Changeset/{changeset-number}
        /// </summary>
        if (data.changeset) {
            $.extend(data, {
                tool: Artifacts_Constants.ToolNames.VersionControl,
                type: Artifacts_Constants.ArtifactTypeNames.Changeset,
                id: data.changeset.toString()
            });
        }
        super(data);
    }

    public getTitle(): string {
        /// <returns type="string" />

        // Changeset {0}
        return Utils_String.format(VCResources.ChangesetLinkTextSimple, this.getId());
    }

    public getUrl(webContext: Contracts_Platform.WebContext): string {
        /// <returns type="string" />
        return VersionControlUrls.getChangesetUrl(this.getId(), new TFS_Host_TfsContext.TfsContext(webContext));
    }
}