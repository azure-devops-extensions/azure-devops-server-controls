import Utils_String = require("VSS/Utils/String");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import {IVersionControlClientService} from "VersionControl/Scripts/IVersionControlClientService";
import {TfvcClientService} from "VersionControl/Scripts/TfvcClientService";
import { RepositoryContext, RepositoryType } from "VersionControl/Scripts/RepositoryContext";
import {GitRepositoryContext} from "VersionControl/Scripts/GitRepositoryContext";

export class TfvcRepositoryContext extends RepositoryContext {

    constructor(tfsContext: TFS_Host_TfsContext.TfsContext, projectName: string = null) {
        super(tfsContext, RepositoryType.Tfvc, "$/" + (projectName ? projectName : ""));
    }

    public static create(tfsContext?: TFS_Host_TfsContext.TfsContext, useProjectContext: boolean = true) {
        let projectName: string;
        if (!tfsContext) {
            tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
        }
        if (useProjectContext && tfsContext.navigation && tfsContext.navigation.project) {
            projectName = tfsContext.navigation.project;
        }
        return new TfvcRepositoryContext(tfsContext, projectName);
    }

    public _createClient(): IVersionControlClientService {
        return TFS_OM_Common.ProjectCollection.getConnection(this.getTfsContext()).getService<TfvcClientService>(TfvcClientService);
    }

    public getTfvcClient() {
        // Convenience method for use until TS generics are supported.
        return <TfvcClientService>this.getClient();
    }

    public comparePaths(a: string, b: string): number {
        return Utils_String.localeIgnoreCaseComparer(a, b);
    }

    public pathStartsWith(path: string, parentPath: string): boolean {
        return (path || "").toLowerCase().indexOf((parentPath || "").toLowerCase()) === 0;
    }

    public getRepositoryClass(): string {
        return "bowtie-tfvc-repo";
    }

    public getProjectId(): string {
        return this.getTfsContext().navigation ? this.getTfsContext().navigation.projectId : undefined;
    }
}
