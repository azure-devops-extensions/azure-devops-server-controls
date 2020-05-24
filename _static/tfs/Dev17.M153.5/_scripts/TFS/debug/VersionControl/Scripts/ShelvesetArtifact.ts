import Utils_String = require("VSS/Utils/String");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Contracts_Platform = require("VSS/Common/Contracts/Platform");
import Artifacts_Constants = require("VSS/Artifacts/Constants");
import Artifacts_Services = require("VSS/Artifacts/Services");
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import {ChangeListType} from "VersionControl/Scripts/ChangeListType";
import * as VersionControlUrls from "VersionControl/Scripts/VersionControlUrls";

export class ShelvesetArtifact extends Artifacts_Services.Artifact {

    public shelvesetName: string;
    public shelvesetOwner: string;

    constructor(data: any) {
        /// <summary>Decodes details of a version control shelveset
        /// which has an artifact URI like:
        /// vstfs:///VersionControl/Shelveset/{item-id}
        /// </summary>

        if (data.name && data.owner) {
            $.extend(data, {
                tool: Artifacts_Constants.ToolNames.VersionControl,
                type: Artifacts_Constants.ArtifactTypeNames.Shelveset,
                id: encodeURIComponent(Utils_String.format('{0}&shelvesetOwner={1}', encodeURIComponent(data.name), encodeURIComponent(data.owner)))
            });
        }
        super(data);
        if (data.name && data.owner) {
            this.shelvesetName = data.name;
            this.shelvesetOwner = data.owner;
        }
    }

    public getTitle(): string {
        /// <returns type="string" />

        // Latest version of {0}
        return Utils_String.format(VCResources.ShelvesetLinkText, Utils_String.format("{0};{1}", this.shelvesetName, this.shelvesetOwner));
    }

    public getUrl(webContext: Contracts_Platform.WebContext): string {
        /// <returns type="string" />

        return VersionControlUrls.getShelvesetUrl(this.shelvesetName, this.shelvesetOwner, new TFS_Host_TfsContext.TfsContext(webContext));
    }
}
