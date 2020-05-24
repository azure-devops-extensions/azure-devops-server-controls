/// Copyright (c) Microsoft Corporation. All rights reserved.

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { GitPermissionsSource } from "VersionControl/Scenarios/Shared/Permissions/GitPermissionsSource";
import { IPolicySource, PolicySource } from "VersionControl/Scenarios/VCAdmin/Sources/PolicySource";
import { IRepoOptionsSource, RepoOptionsSource } from "VersionControl/Scenarios/VCAdmin/Sources/RepoOptionsSource";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";

export class VCAdminSourcesHub {
    public repoOptionsSource: IRepoOptionsSource;
    public policySource: IPolicySource;
    public gitPermissionsSource: GitPermissionsSource;

    private _repoContext: RepositoryContext;

    constructor(repoContext: RepositoryContext, tfsContext: TfsContext) {
        this._repoContext = repoContext;

        this.repoOptionsSource = new RepoOptionsSource(this._repoContext);
        this.policySource = new PolicySource(tfsContext);
        this.gitPermissionsSource = new GitPermissionsSource(null, null);
    }
}
