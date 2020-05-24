import { GitAnnotatedTag } from "TFS/VersionControl/Contracts";
import { VersionControlActionIds } from "VersionControl/Scripts/Controls/ControlsCommon";
import { CodeHubContributionIds } from "VersionControl/Scripts/CodeHubContributionIds";
import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";
import { CustomerIntelligenceData, CustomerIntelligenceProperty } from "VersionControl/Scripts/CustomerIntelligenceData";
import { GitObjectType } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { TagsNameValidator } from "VersionControl/Scripts/RefNameValidator";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import * as GitRefService from "VersionControl/Scripts/Services/GitRefService";
import { VersionSpec, IGitRefVersionSpec, GitTagVersionSpec, GitCommitVersionSpec } from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { getExplorerUrl, getCommitDetailUrl } from "VersionControl/Scripts/VersionControlUrls";
import { ActionsHub, TagCreationStatus } from "VersionControl/Scenarios/Tags/CreateTags/ActionsHub";
import { State } from "VersionControl/Scenarios/Tags/CreateTags/CreateTagStore";
import { refreshPage } from "VersionControl/Scripts/Utils/XhrNavigationUtilsNonReact";

export class ActionsCreator {
    private nameValidator: TagsNameValidator;

    constructor(
        private _actionsHub: ActionsHub,
        private _getState: () => State,
        private _repositoryContext: RepositoryContext,
        private _gitRefService?: GitRefService.IGitRefService) {
        this.nameValidator = new TagsNameValidator([]);
    }

    public createTag = (): void => {
        this._actionsHub.tagCreationStatusChanged.invoke({
            complete: false,
            inProgress: true,
            error: "",
        });

        this.getGitRefService().createTagRefs(
            this._getState().tagName,
            this._getState().message,
            this._getState().selectedVersion as IGitRefVersionSpec).then(
            (tag: GitAnnotatedTag) => {
                this._actionsHub.tagCreationStatusChanged.invoke({
                    complete: true,
                    inProgress: false,
                    error: null,
                } as TagCreationStatus);

                this._redirectToUrl();
            },
            (error) => {
                this._actionsHub.tagCreationStatusChanged.invoke({
                    complete: false,
                    error: error.message || error,
                    inProgress: false
                })
            });
    }

    public updateMessage = (message: string): void => {
        this._actionsHub.messageChanged.invoke(message);
    }

    public updateVersion = (version: VersionSpec): void => {
        this._actionsHub.selectedVersionChanged.invoke(version);
    }

    public updateTagName = (name: string): string => {

        const validationResult = this.nameValidator.validate(name);       
        this._actionsHub.tagNameValidationStatusChanged.invoke({
            error: validationResult.allValid ? undefined : validationResult.error,
            name: name,
        });
        return validationResult.error;
    }

    public recordTelemetry = (
        featureName: string,
        actionSource?: string,
        viewName?: string,
        properties?: CustomerIntelligenceProperty[]): void => {
        
        const ci = new CustomerIntelligenceData();
        if (viewName) {
            ci.properties["InitiatedFromView"] = viewName;
        }
        ci.publish(featureName, true, actionSource, null, properties);
    }

    private _redirectToUrl(): void {
        refreshPage();
    }

    private getGitRefService(): GitRefService.IGitRefService {
        return this._gitRefService || GitRefService.getGitRefService(this._repositoryContext as GitRepositoryContext);
    }
}
