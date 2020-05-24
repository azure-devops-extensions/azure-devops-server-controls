import Utils_String = require("VSS/Utils/String");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Contracts_Platform = require("VSS/Common/Contracts/Platform");
import Artifacts_Constants = require("VSS/Artifacts/Constants");
import Artifacts_Services = require("VSS/Artifacts/Services");
import {ChangeListType} from "VersionControl/Scripts/ChangeListType";
import * as VersionControlUrls from "VersionControl/Scripts/VersionControlUrls";
import {GitRefArtifact} from "VersionControl/Scripts/GitRefArtifact";
import Diag = require("VSS/Diag");

export class PullRequestArtifact extends Artifacts_Services.Artifact {
    //{projectId}/{repoId}/{pullrequestid}
    public static ToolSpecificRefIdFormat: string = "{0}/{1}/{2}";

    public projectGuid: string;
    public repositoryId: string;
    public pullRequestId: number;

    constructor(data: any) {
        /// <summary> Decodes Pull request details of an artifact URI like:
        /// vstfs:///Git/PullRequestId/<teamprojectid>/<repositoryid>/<pullRequestId>
        /// </summary>

        if (data.projectGuid && data.repositoryId && data.pullRequestId) {
            $.extend(data, {
                tool: Artifacts_Constants.ToolNames.Git,
                type: Artifacts_Constants.ArtifactTypeNames.PullRequestId,
                id: Utils_String.format(GitRefArtifact.ToolSpecificRefIdFormat, data.projectGuid, data.repositoryId, data.pullRequestId)
            });
        }
        super(data);
        if (data.projectGuid && data.repositoryId && data.pullRequestId) {
            this.projectGuid = data.projectGuid;
            this.repositoryId = data.repositoryId;
            this.pullRequestId = data.pullRequestId;
        }
    }

    public getTitle(): string {
        /// <returns type="string" />

        this._ensureDetails();

        return this.pullRequestId.toString();
    }

    public getUrl(webContext: Contracts_Platform.WebContext): string {
        /// <returns type="string" >The Url for the Pull Request</returns>

        this._ensureDetails();

        return VersionControlUrls.getPullRequestUrlUsingRepoId(this.repositoryId, this.projectGuid, this.pullRequestId, new TFS_Host_TfsContext.TfsContext(webContext));
    }

    private _ensureDetails() {
        let parts: string[];
        if (!this.pullRequestId || !this.repositoryId) {
            parts = decodeURIComponent(this._data.id).split('/');
            Diag.Debug.assert(parts.length === 3, "The uri is incorrect");

            this.projectGuid = parts[0];
            this.repositoryId = parts[1];
            this.pullRequestId = Number(parts[2]);
        }
    }
}
