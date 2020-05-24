import VSS = require("VSS/VSS");
import VCLegacyContracts = require("VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts");
import {GitRepositoryContext} from "VersionControl/Scripts/GitRepositoryContext";
import { RepositoryContext, RepositoryType } from "VersionControl/Scripts/RepositoryContext";
import {TfvcVersionControlPath} from "VersionControl/Scripts/TfvcVersionControlPath";
import VCWikiLinkTransformer = require("VersionControl/Scripts/TFS.VersionControl.WikiLinkTransformer");
import VC = require("VersionControl/Scripts/TFS.VersionControl");
import * as VersionControlPath from "VersionControl/Scripts/VersionControlPath";
import UrlProvider = require("Welcome/Scripts/TFS.Welcome.UrlProvider");

export class WelcomeWikiLinkTransformer extends VCWikiLinkTransformer.WikiLinkTransformer {

    constructor(repositoryContext: RepositoryContext, item: VCLegacyContracts.ItemModel) {
        super(repositoryContext, item);
    }

    private getWelcomeUrl(uri: string, anchorName?: string): string {

        var routeData: any = null;
        var state: any;
        var repositoryType: RepositoryType = this.getRepositoryContext().getRepositoryType();
        var name: string;

        var tfsContext = this.getRepositoryContext().getTfsContext();
        // generate welcome view link
        if (repositoryType === RepositoryType.Git) {
            name = (<GitRepositoryContext>this.getRepositoryContext()).getRepository().name;
        }
        else if (repositoryType === RepositoryType.Tfvc) {

            name = tfsContext.navigation.project;

            var currentProject = new TfvcVersionControlPath(this.getItem().serverItem).getProjectName();
            var newProject = new TfvcVersionControlPath(uri).getProjectName();
            
            if (newProject && currentProject && newProject !== currentProject) {
                routeData = { project: newProject };
                name = newProject;
            }
        }
        else {
            throw new Error("Repository type must be one of {Git, TFS}");
        }

        state = { name: name, path: uri };
        if (anchorName) {
            state.anchor = anchorName;
        }
        return UrlProvider.getWelcomeUrl(this.getRepositoryContext(), name, repositoryType, uri, UrlProvider.Actions.VIEW, state, routeData);
    }

    public getBrowserUri(uri: string, anchorName?: string): string {

        var fileExtension: string = VersionControlPath.getFileExtension(uri).toLowerCase();
        if (fileExtension === "md") {
            return this.getWelcomeUrl(uri, anchorName);
        }
        else {
            return this.getCodeExplorerUrl(uri, anchorName);
        }
    }
}

VSS.tfsModuleLoaded("TFS.Welcome.WikiLinkTransformer", exports);
