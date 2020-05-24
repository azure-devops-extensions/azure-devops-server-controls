import Utils_String = require("VSS/Utils/String");
import Documents = require("Presentation/Scripts/TFS/TFS.Welcome.Documents");
import PresentationResources = require("Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation");
import VC = require("VersionControl/Scripts/TFS.VersionControl");
import {GitRepositoryContext} from "VersionControl/Scripts/GitRepositoryContext";
import { RepositoryContext, RepositoryType } from "VersionControl/Scripts/RepositoryContext";
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import VCLegacyContracts = require("VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts");
import VCSourceEditing = require("VersionControl/Scripts/Controls/SourceEditing");
import VCFileDefaultContentProviderScenario = require("VersionControl/Scripts/TFS.VersionControl.FileDefaultContentProvider.Scenario");
import URI = require("Presentation/Scripts/URI");
import {TfvcVersionControlPathUtility} from "VersionControl/Scripts/TfvcVersionControlPathUtility";

export class FileDefaultContentProviderParameters {
    repositoryContext: RepositoryContext;
    item: VCLegacyContracts.ItemModel;
    repositoryExists: boolean = true;
    showError: boolean = false;
}

export interface IFileDefaultContentProvider {
    getContent(params: FileDefaultContentProviderParameters): string;
}

function decodeResourceStringIntoMarkdownFormat(str: string): string {
    let regexR = /\\\\r/g;
    let regexN = /\\\\n/g;
    let regexT = /\\\\t/g;

    return str.replace(regexR, "\r").replace(regexN, "\n").replace(regexT, "\t");
}

function getErrorMessage(path: string): string {

    if (VCSourceEditing.EditingEnablement.isSourceEditingFeatureEnabled()) {
        return Utils_String.format(decodeResourceStringIntoMarkdownFormat(PresentationResources.InfoArea_FileDoesNotExist), path);
    }
    else {
        return Utils_String.format(decodeResourceStringIntoMarkdownFormat(PresentationResources.InfoArea_FileDoesNotExist_NoEdit), path);
    }
}

function getDefaultReadmeBase(title: string): string {
    let defaultReadmeBase = Utils_String.format(decodeResourceStringIntoMarkdownFormat(PresentationResources.InfoArea_DefaultReadmeMD_base), title);
    return defaultReadmeBase;
}

function getDefaultMarkdownBase(title: string, filename: string): string {
    let defaultMarkdownBase = Utils_String.format(decodeResourceStringIntoMarkdownFormat(PresentationResources.InfoArea_DefaultMD_base), title, filename);
    return defaultMarkdownBase;
}

export class GitMarkdownFileDefaultContentProvider implements IFileDefaultContentProvider {

    constructor(private options?) {
    }

    public getContent(parameters: FileDefaultContentProviderParameters): string {
        if (!parameters.repositoryContext) {
            throw new Error("repositoryContext parameter is required");
        }
        if (!parameters.item) {
            throw new Error("item parameter is required");
        }
        let repositoryContext = <GitRepositoryContext>parameters.repositoryContext;
        let repositoryName = repositoryContext.getRepository().name;
        let isDefaultMarkdown = Utils_String.localeIgnoreCaseComparer(parameters.item.serverItem, Documents.DocumentConstants.DEFAULT_FILE_PATH) === 0;
        let filePath = parameters.item.serverItem.substr(1);
        let content = "";

        if (parameters.showError) {
            content += getErrorMessage(filePath);
        }

        if (isDefaultMarkdown) {
            let isProject = repositoryName === repositoryContext.getTfsContext().navigation.project;
            if (isProject) {
                if (!parameters.repositoryExists) {
                    content += this.getDefaultRepoMarkdown(repositoryContext.getTfsContext());
                }
                content += this.getDefaultReadmeMarkdown(repositoryName, PresentationResources.InfoArea_Project_Commit);
            } else {
                content += this.getDefaultReadmeMarkdown(repositoryName, PresentationResources.InfoArea_Repo_Commit);
            }
        } else {

            let fileName = new URI(parameters.item.serverItem).filename();
            content += getDefaultMarkdownBase(repositoryName, fileName);
        }
        return content;
    }

    private getDefaultReadmeMarkdown(title: string, commitMessage: string): string {
        return getDefaultReadmeBase(title);
    }

    private getDefaultRepoMarkdown(tfsContext: TFS_Host_TfsContext.TfsContext): string {
        return Utils_String.format(decodeResourceStringIntoMarkdownFormat(PresentationResources.InfoArea_DefaultRepoMD), tfsContext.navigation.project, tfsContext.getPublicActionUrl(null, "versioncontrol", { area: "admin" }));
    }
}

export class TfvcMarkdownFileDefaultContentProvider implements IFileDefaultContentProvider {

    private _vcEditorEnablement: any;

    constructor(private options?) {
        this._vcEditorEnablement = (typeof options !== 'undefined' && options.vcEditorEnablement) || VCSourceEditing.EditingEnablement;
    }

    public getContent(parameters: FileDefaultContentProviderParameters): string {
        if (!parameters.repositoryContext) {
            throw new Error("repositoryContext parameter is required");
        }
        if (!parameters.item) {
            throw new Error("item parameter is required");
        }
        let projectRelFilePath = TfvcVersionControlPathUtility.getProjectRelativePathFromAbsolutePath(parameters.item.serverItem);
        let isDefaultMarkdown = Utils_String.localeIgnoreCaseComparer("/" + projectRelFilePath, Documents.DocumentConstants.DEFAULT_FILE_PATH) === 0;
        let project = parameters.repositoryContext.getTfsContext().navigation.project;

        let content: string = "";
        if (parameters.showError) {
            content += getErrorMessage(projectRelFilePath);
        }

        if (isDefaultMarkdown) {
            content += getDefaultReadmeBase(project);

        } else {
            let fileName = new URI(parameters.item.serverItem).filename();
            content += getDefaultMarkdownBase(project, fileName);
        }

        return content;
    }
}

export module FileDefaultContentProviderFactory {
    let _providers: { [key: string]: IFileDefaultContentProvider } = {};

    export function registerProvider(provider: IFileDefaultContentProvider, fileExtension: string, repositoryType: RepositoryType, scenario: string) {
        _providers[makeKey(fileExtension, repositoryType, scenario)] = provider;
    }

    export function getProvider(fileExtension: string, repositoryType: RepositoryType, scenario: string): IFileDefaultContentProvider {
        return _providers[makeKey(fileExtension, repositoryType, scenario)];
    }

    function makeKey(fileExtension: string, repositoryType: RepositoryType, scenario: string): string {

        if (!scenario) {
            scenario = "";
        }
        return fileExtension.toLowerCase() + "/" + repositoryType + "/" + scenario.toLowerCase();
    }
}

FileDefaultContentProviderFactory.registerProvider(new GitMarkdownFileDefaultContentProvider(), Documents.DocumentConstants.MARKDOWN_FILE_EXT, RepositoryType.Git, VCFileDefaultContentProviderScenario.Scenario.MissingFile);
FileDefaultContentProviderFactory.registerProvider(new TfvcMarkdownFileDefaultContentProvider(), Documents.DocumentConstants.MARKDOWN_FILE_EXT, RepositoryType.Tfvc, VCFileDefaultContentProviderScenario.Scenario.MissingFile);
