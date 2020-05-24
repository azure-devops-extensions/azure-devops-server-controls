import Utils_String = require("VSS/Utils/String");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Contracts_Platform = require("VSS/Common/Contracts/Platform");
import Artifacts_Constants = require("VSS/Artifacts/Constants");
import Artifacts_Services = require("VSS/Artifacts/Services");
import Diag = require("VSS/Diag");
import * as VersionControlUrls from "VersionControl/Scripts/VersionControlUrls";
import {ChangeListType} from "VersionControl/Scripts/ChangeListType";
import * as CommitIdHelper from "VersionControl/Scripts/CommitIdHelper";

export class GitRefArtifact extends Artifacts_Services.Artifact {
    //{projectId}/{repoId}/{refName}
    public static ToolSpecificRefIdFormat: string = "{0}/{1}/{2}";

    public projectGuid: string;
    public repositoryId: string;
    public refName: string;

    constructor(data: any) {
        /// <summary> Decodes Git Ref details of an artifact URI like:
        /// vstfs:///Git/Ref/<teamprojectid>/<repositoryid>/refName
        /// </summary>

        if (data.projectGuid && data.repositoryId && data.refName) {
            $.extend(data, {
                tool: Artifacts_Constants.ToolNames.Git,
                type: Artifacts_Constants.ArtifactTypeNames.Ref,
                id: Utils_String.format(GitRefArtifact.ToolSpecificRefIdFormat, data.projectGuid, data.repositoryId, data.refName)
            });
        }
        super(data);
        if (data.projectGuid && data.repositoryId && data.refName) {
            this.projectGuid = data.projectGuid;
            this.repositoryId = data.repositoryId;
            this.refName = data.refName;
        }
    }

    public getTitle(): string {
        /// <returns type="string" />

        this._ensureDetails();

        //Remove GB/GT from the ref name
        return this.refName.substring(2);
    }

    public getUrl(webContext: Contracts_Platform.WebContext): string {
        /// <returns type="string" >The Url for the Git Ref</returns>

        this._ensureDetails();
        let tfsContext = new TFS_Host_TfsContext.TfsContext(webContext);
        return VersionControlUrls.getRefUrlUsingRepoId(this.repositoryId, this.projectGuid, this.refName, tfsContext);
    }

    private _ensureDetails() {
        let parts: string[];
        if (!this.refName || !this.repositoryId) {
            parts = decodeURIComponent(this._data.id).split('/');
            Diag.Debug.assert(parts.length >= 3, "The uri is incorrect");

            this.projectGuid = parts[0];
            this.repositoryId = parts[1];
            parts.splice(0, 2);
            this.refName = parts.join('/');
        }
    }
}
