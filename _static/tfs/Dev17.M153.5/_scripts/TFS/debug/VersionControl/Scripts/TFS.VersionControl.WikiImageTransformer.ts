import VSS = require("VSS/VSS");
import ContentRendering = require("Presentation/Scripts/TFS/TFS.ContentRendering");
import { RepositoryContext, RepositoryType } from "VersionControl/Scripts/RepositoryContext";
import * as VersionControlUrls from "VersionControl/Scripts/VersionControlUrls";
import VCLegacyContracts = require("VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts");
import URI = require("Presentation/Scripts/URI");
import {TfvcVersionControlPathUtility} from "VersionControl/Scripts/TfvcVersionControlPathUtility";
import {GitVersionControlPathUtility} from "VersionControl/Scripts/GitVersionControlPathUtility";
import {TfvcVersionControlPath} from "VersionControl/Scripts/TfvcVersionControlPath";

export class WikiImageTransformer implements ContentRendering.IImageTransformer {

    constructor(private repositoryContext: RepositoryContext, private item: VCLegacyContracts.ItemModel) {
    }

    public getRepositoryContext(): RepositoryContext {
        return this.repositoryContext;
    }

    public getItem(): VCLegacyContracts.ItemModel {
        return this.item;
    }

    private getGitVersionControlUri(src: string): string {

        let versionControlPath = GitVersionControlPathUtility.combine(this.item.serverItem, src);
        return versionControlPath;
    }

    private getTfsVersionControlUri(src: string): string {

        let versionControlPath = TfvcVersionControlPathUtility.combine(this.item.serverItem, src);
        return versionControlPath;
    }

    private getFileContentApiUri(versionControlPath: string): string {

        let repositoryType: RepositoryType = this.repositoryContext.getRepositoryType();
        let routeData: any = null;
        let version: string = null;

        if (repositoryType === RepositoryType.Tfvc) {

            let currentPath = new TfvcVersionControlPath(this.item.serverItem);
            let newPath = new TfvcVersionControlPath(versionControlPath);

            if (newPath.getProjectName() && currentPath.getProjectName() && newPath.getProjectName() !== currentPath.getProjectName()) {
                routeData = { project: newPath.getProjectName() };
            }
        }
        else if(repositoryType === RepositoryType.Git) {
            version = this.item.version;
        }
        else {
            throw new Error("Repository type must be one of {Git, TFS}");
        }

        let fileContentUri = VersionControlUrls.getFileContentUrl(this.repositoryContext, versionControlPath, version, true, routeData);
        return fileContentUri;
    }

    private getFileContentUri(path: string): string {

        let repositoryType: RepositoryType = this.repositoryContext.getRepositoryType();
        let versionControlUri: string;
        
        if (repositoryType === RepositoryType.Git) {

            versionControlUri =  this.getGitVersionControlUri(path);
        }
        else if (repositoryType === RepositoryType.Tfvc) {

            versionControlUri = this.getTfsVersionControlUri(path);
        }
        else {
            return path;
        }

        let fileContentUrl = this.getFileContentApiUri(versionControlUri);
        return fileContentUrl;
    }

    public transformImage(src: string): string {

        if (!src) {
            return src;
        }

        let uri = new URI(src);
        if (uri.is("absolute")) {
            return src;
        }
        let path = URI.decode(src);

        return this.getFileContentUri(path);
    }
}

VSS.tfsModuleLoaded("TFS.VersionControl.WikiImageTransformer", exports);
