import Utils_String = require("VSS/Utils/String");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Contracts_Platform = require("VSS/Common/Contracts/Platform");
import Artifacts_Constants = require("VSS/Artifacts/Constants");
import Artifacts_Services = require("VSS/Artifacts/Services");
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import {ChangeListType} from "VersionControl/Scripts/ChangeListType";
import * as VersionControlUrls from "VersionControl/Scripts/VersionControlUrls";
import * as CommitIdHelper from "VersionControl/Scripts/CommitIdHelper";

export class CommitArtifact extends Artifacts_Services.Artifact {

    public projectGuid: string;
    public repositoryId: string;
    public commitId: string;

    constructor(data: any) {
        /// <summary> Decodes commit details of an artifact URI like:
        /// vstfs:///Git/Commit/<teamprojectid>/<repositoryid>/<commitId>
        /// </summary>

        if (data.projectGuid && data.repositoryId && data.commitId) {
            $.extend(data, {
                tool: Artifacts_Constants.ToolNames.Git,
                type: Artifacts_Constants.ArtifactTypeNames.Commit,
                id: Utils_String.format('{0}/{1}/{2}', data.projectGuid, data.repositoryId, data.commitId)
            });
        }
        super(data);
        if (data.projectGuid && data.repositoryId && data.commitId) {
            this.projectGuid = data.projectGuid;
            this.repositoryId = data.repositoryId;
            this.commitId = data.commitId;
        }
    }

    public getTitle(): string {
        /// <returns type="string" />

        this._ensureDetails();

        // Commit {0}
        return Utils_String.format(VCResources.CommitLinkText, CommitIdHelper.getShortCommitId(this.commitId) + '...');
    }

    public getUrl(webContext: Contracts_Platform.WebContext): string {
        /// <returns type="string" />

        this._ensureDetails();

        return VersionControlUrls.getCommitUrlUsingRepoId(this.repositoryId, this.projectGuid, this.commitId, new TFS_Host_TfsContext.TfsContext(webContext));
    }

    private _ensureDetails() {
        let parts: string[];
        if (!this.commitId || !this.repositoryId) {
            parts = decodeURIComponent(this._data.id).split('/');

            this.projectGuid = parts[0];
            this.repositoryId = parts[1];
            this.commitId = parts[2];
        }
    }
}
