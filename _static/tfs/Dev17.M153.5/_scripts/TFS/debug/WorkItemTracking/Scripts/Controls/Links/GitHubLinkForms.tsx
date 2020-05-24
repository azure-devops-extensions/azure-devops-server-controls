import "VSS/LoaderPlugins/Css!Controls/Links/GitHubLinkForm";
import { ArtifactTypeNames, ToolNames } from "VSS/Artifacts/Constants";
import { isSafeProtocol } from "VSS/Utils/Url";
import { localeFormat } from "VSS/Utils/String";
import { IExternalLinkedArtifact } from "TFS/WorkItemTracking/ExtensionContracts";
import { ExternalConnectionLinkForm } from "WorkItemTracking/Scripts/Controls/Links/ExternalConnectionLinkForm";
import { resolveGitHubUrls } from "WorkItemTracking/Scripts/OM/GitHubLinkDataSource";
import { RegisteredLinkTypeNames } from "WorkItemTracking/Scripts/RegisteredLinkTypeNames";
import { createGitHubArtifactUrlFromContext } from "WorkItemTracking/Scripts/Utils/GitHubArtifactLink";
import * as Resources from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";
import * as ReactDOM from "react-dom";
import * as React from "react";
import { MessageBar } from "OfficeFabric/MessageBar";
import { Link } from "OfficeFabric/Link";

/**
 * Abstract link form for all git hub artifact links
 */
abstract class GitHubLinkForm extends ExternalConnectionLinkForm<IExternalLinkedArtifact> {
    protected _externalLinkContext: IExternalLinkedArtifact;

    public initialize(): void {
        super.initialize();

        this._createGitHubHelp();
    }

    private _createGitHubHelp() {
        if (this._element !== null) {
            const container = $("<div>");
            this._element.prepend(container);
            ReactDOM.render(
                <MessageBar className="link-dialog-github-help">
                    <Link href="https://aka.ms/azureboardsgithub">{Resources.NewFeatureLearnMoreLinkTitle}</Link> {Resources.LinksControlGitHubHelpText_about}
                </MessageBar>,
                container[0]
            );
        }
    }

    protected resolveUrl(urlInput: string): Promise<IExternalLinkedArtifact[]> {
        return resolveGitHubUrls([urlInput], this._workItem && this._workItem.id);
    }

    protected _performUrlValidation = async (url: string): Promise<string> => {
        if (!url) {
            return this._onValidationFailed(Resources.LinksControlEnterUrl);
        } else if (!isSafeProtocol(url)) {
            return this._onValidationFailed(localeFormat(Resources.GitHubInputNotValid, this.getPrettyLinkTypeName()));
        } else if (!this.isValidExternalConnectionUrl(url)) {
            return this._onValidationFailed(localeFormat(Resources.GitHubInputNotValid, this.getPrettyLinkTypeName()));
        } else {
            const linkResult = await this.resolveUrl(url);
            if (linkResult && linkResult.length > 0) {
                const externalLink = linkResult[0] as IExternalLinkedArtifact;

                if (externalLink.errorMessage) {
                    return this._onValidationFailed(externalLink.errorMessage);
                }

                // If the result doesn't contain id/repoId then it means we couldn't resolve url
                if (!externalLink.repoInternalId || !externalLink.numberOrSHA) {
                    return this._onValidationFailed(this._getCannotResolveExternalLinkResourceErrorMessage());
                }

                this._externalLinkContext = {
                    ...externalLink
                };

                if (this._isDuplicate()) {
                    return this._onValidationFailed(localeFormat(Resources.GitHubLinkAlreadyExists, this.getLinkTypeName()));
                } else {
                    return this._onValidationSucceeded();
                }
            } else {
                return this._onValidationFailed(this._getCannotResolveExternalLinkResourceErrorMessage());
            }
        }
    }

    private _isDuplicate(): boolean {
        const artifactUrl = this._getArtifactUrl();
        return this._validator.isDuplicate(artifactUrl);
    }

    private _getArtifactUrl(): string {
        return createGitHubArtifactUrlFromContext(this._toolName, this._artifactTypeName, this._externalLinkContext);
    }

    private _getCannotResolveExternalLinkResourceErrorMessage() {
        return localeFormat(Resources.CannotResolveExternalLinkResource, this._artifactTypeName);
    }

    public getPrettyLinkTypeName() {
        const linkTypeName = this.getLinkTypeName();
        switch (linkTypeName) {
            case RegisteredLinkTypeNames.GitHubPullRequestLinkType:
                return Resources.LinksControlGitHubPullRequestText;
            case RegisteredLinkTypeNames.GitHubCommitLinkType:
                return Resources.LinksControlGitHubCommitText;
        }
    }

    public getLinkResult() {
        return {
            linkType: this.getLinkTypeName(),
            comment: this.getComment(),
            links: [{
                artifactUri: this._getArtifactUrl()
            }],
            externalLinkContext: this._externalLinkContext
        };
    }
}

export class GitHubPullRequestLinkForm extends GitHubLinkForm {
    protected _label: string = Resources.GithubPRLinkDialogAddressTitle;
    protected _watermark: string = Resources.GithubPRLinkDialogAddressTitleWatermark;
    protected _toolName: string = ToolNames.GitHub;
    protected _artifactTypeName: string = ArtifactTypeNames.PullRequest;

    constructor(options) {
        super({ ...options, linkTypeName: RegisteredLinkTypeNames.GitHubPullRequestLinkType });
    }

    protected isValidExternalConnectionUrl(url: string): boolean {
        return this._validator.isValidPullRequestUrl(url);
    }

    protected getLinkServerResolutionFailureMessage() {
        return Resources.CannotResolveExternalGitHubPullRequestUrl;
    }
}

export class GitHubCommitLinkForm extends GitHubLinkForm {
    protected _label: string = Resources.GithubCommitLinkDialogAddressTitle;
    protected _watermark: string = Resources.GithubCommitLinkDialogAddressTitleWatermark;
    protected _toolName: string = ToolNames.GitHub;
    protected _artifactTypeName: string = ArtifactTypeNames.Commit;

    constructor(options) {
        super({ ...options, linkTypeName: RegisteredLinkTypeNames.GitHubCommitLinkType });
    }

    protected isValidExternalConnectionUrl(url: string): boolean {
        return this._validator.isValidCommitUrl(url);
    }

    protected getLinkServerResolutionFailureMessage() {
        return Resources.CannotResolveExternalGitHubCommitUrl;
    }
}
