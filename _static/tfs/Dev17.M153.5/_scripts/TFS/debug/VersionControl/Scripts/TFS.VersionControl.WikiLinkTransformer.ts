import VSS = require("VSS/VSS");
import * as ContentRendering from "Presentation/Scripts/TFS/TFS.ContentRendering";
import URI = require("Presentation/Scripts/URI");

import { VersionControlActionIds, getFragmentAction } from "VersionControl/Scripts/Controls/ControlsCommon";
import VCLegacyContracts = require("VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts");
import { RepositoryContext, RepositoryType } from "VersionControl/Scripts/RepositoryContext";
import * as VersionControlPath from "VersionControl/Scripts/VersionControlPath";
import * as VersionControlUrls from "VersionControl/Scripts/VersionControlUrls";
import {TfvcVersionControlPathUtility} from "VersionControl/Scripts/TfvcVersionControlPathUtility";
import {GitVersionControlPathUtility} from "VersionControl/Scripts/GitVersionControlPathUtility";
import {TfvcVersionControlPath} from "VersionControl/Scripts/TfvcVersionControlPath";

export class WikiLinkTransformer implements ContentRendering.ILinkTransformer {

    constructor(
        private repositoryContext: RepositoryContext,
        private item: VCLegacyContracts.ItemModel,
        private useLinkFragments: boolean = false) {
    }

    public getRepositoryContext(): RepositoryContext {
        return this.repositoryContext;
    }

    public getItem(): VCLegacyContracts.ItemModel {
        return this.item;
    }

    public getBrowserUri(uri: string, anchorName?: string): string {
        throw new Error("This should be overriden in the derived class.");
    }

    private getGitVersionControlPath(href: string): string {

        let versionControlPath = GitVersionControlPathUtility.combine(this.item.serverItem, href);
        return versionControlPath;
    }

    private getTfsVersionControlPath(href: string): string {

        let versionControlPath = TfvcVersionControlPathUtility.combine(this.item.serverItem, href);
        return versionControlPath;
    }

    private transformRelativeLink(href: string): string {

        if (href && href.charAt(0) === "#") {
            href = this.item.serverItem + href;
        }

        let uri = new URI(href);
        let anchorName = URI.decode(uri.fragment());
        uri.fragment("");
        let path = URI.decode(uri.href());

        let repositoryType: RepositoryType = this.repositoryContext.getRepositoryType();
        let versionControlPath: string;
        if (repositoryType == RepositoryType.Git) {

            versionControlPath = this.getGitVersionControlPath(path);
        }
        else if (repositoryType == RepositoryType.Tfvc) {

            versionControlPath = this.getTfsVersionControlPath(path);
        }
        else {
            return path;
        }
        
        let browserUri = this.getBrowserUri(versionControlPath, anchorName);
        return browserUri;
    }

    public transformLink(href: string): string {
        if (!href) {
            return href;
        }

        let uri = new URI(href);
        if (uri.is("absolute")) {
            return href;
        }

        return this.transformRelativeLink(href);
    }

    public getCodeExplorerUrl(uri: string, anchorName?: string): string {

        let repositoryType: RepositoryType = this.repositoryContext.getRepositoryType();
        let state: any;
        let routeData: any = null;

        if (repositoryType === RepositoryType.Git) {

            state = { path: uri, version: this.item.version };
        }
        else if (repositoryType === RepositoryType.Tfvc) {

            state = { path: uri };
            
            let currentProject = new TfvcVersionControlPath(this.getItem().serverItem).getProjectName();
            let newProject = new TfvcVersionControlPath(uri).getProjectName();

            if (newProject && currentProject && newProject !== currentProject) {
                routeData = { project: newProject };
            }
        }
        else {

            throw new Error("Repository type must be one of {Git, TFS}");
        }

        let action = VersionControlActionIds.Contents;
        let fileExtension: string = VersionControlPath.getFileExtension(uri.toLowerCase());
        if (fileExtension === "md") {
            state.createIfNew = true;
            action = VersionControlActionIds.Preview;
        }
        if (anchorName) {
            state.anchor = anchorName;
        }

        if (this.useLinkFragments) {
            return getFragmentAction(action, uri, state.version, state);
        } else {
            return VersionControlUrls.getExplorerUrl(this.repositoryContext, uri, action, state, routeData);        
        }
    }

}

export class CodeExplorerWikiLinkTransformer extends WikiLinkTransformer {

    constructor(
        repositoryContext: RepositoryContext,
        item: VCLegacyContracts.ItemModel,
        useLinkFragments: boolean = false,
    ) {
        super(repositoryContext, item, useLinkFragments);
    }

    public getBrowserUri(uri: string, anchorName?: string): string {

        return this.getCodeExplorerUrl(uri, anchorName);
    }
}

VSS.tfsModuleLoaded("TFS.VersionControl.WikiLinkTransformer", exports);
