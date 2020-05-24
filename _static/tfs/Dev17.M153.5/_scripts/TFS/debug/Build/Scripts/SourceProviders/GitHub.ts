/// <reference types="jquery" />
/// <reference path="../Interfaces.d.ts" />
import Q = require("q");

import { BaseSourceProvider } from "Build/Scripts/SourceProviders/BaseSourceProvider";
import * as BuildResources from "Build/Scripts/Resources/TFS.Resources.Build";
import { RepositoryFactory } from "Build/Scripts/RepositoryFactory";
import * as GitHubRepositoryEditor_NO_REQUIRE from "Build/Scripts/SourceProviders/GitHub.GitHubRepositoryEditor";
import { ISourceProvider } from "Build/Scripts/SourceProviders/SourceProvider";

import { RepositoryTypes } from "Build.Common/Scripts/Generated/TFS.Build2.Common";

import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import { Build, BuildRepository, Change, DefinitionTriggerType } from "TFS/Build/Contracts";

import { getRefFriendlyName } from "VersionControl/Scripts/GitRefUtility";
import * as VCClient_NO_REQUIRE from "VersionControl/Scripts/TFS.VersionControl.ClientServices";
import { ChangeList } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";

import { CommonActions, getService as getEventService } from "VSS/Events/Action";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import * as Utils_String from "VSS/Utils/String";
import * as Utils_UI from "VSS/Utils/UI";
import * as VSS from "VSS/VSS";

let domElem = Utils_UI.domElem;

export class GitHubSourceProvider extends BaseSourceProvider implements ISourceProvider {
    public initialize(options: any) {
    }

    public key(): string {
        return RepositoryTypes.GitHub;
    }

    public isEnabled(): boolean {
        return FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.WebAccessBuildvNextGitHubRepository);
    }

    public getSourceVersionText(build: Build) {
        if (build.sourceVersion) {
            return build.sourceVersion.slice(0, 7);
        }
        else {
            return "";
        }
    }

    public getSourceVersionGridCell(build: Build): JQuery {
        return $(domElem("span")).text(this.getSourceVersionText(build));
    }

    public getRepoIconClass(): string {
        return "bowtie-brand-github";
    }

    public getChangeText(change: Change) {
        if (change && change.id) {
            return Utils_String.format(BuildResources.BuildDetailViewCommitId, change.id.slice(0, 7));
        }
        else {
            return "";
        }
    }

    public canLinkChange(): boolean {
        return true;
    }

    public onChangeClick(tfsContext: TfsContext, build: Build, change: Change) {
        if (change.displayUri) {
            window.open(change.displayUri, "_blank");
        }
    }

    public onSourceVersionClick(tfsContext: TfsContext, build: Build): void {
        let url = build._links.sourceVersionDisplayUri;

        if (url && url.href) {
            getEventService().performAction(CommonActions.ACTION_WINDOW_OPEN, {
                target: "_blank",
                url: url.href
            });
        }
    }

    public getSourceVersionLink(tfsContext: TfsContext, build: Build): string {
        let url = build._links.sourceVersionDisplayUri;

        if (url) {
            return url.href;
        }
        else {
            return "";
        }
    }

    public getChangeUrl(tfsContext: TfsContext, build: Build, change: Change): string {
        return change.displayUri || "";
    }

    public getSourceBranch(build: Build): string {
        if (build && build.sourceBranch) {
            return getRefFriendlyName(build.sourceBranch);
        }

        return "";
    }

    public getSourceBranchLabel(sourceBranch: string): string {
        return BuildResources.BuildSummarySourceBranchLabel;
    }

    public createRepositoryFactory(tfsContext: TfsContext): RepositoryFactory {
        return {
            isPrimary: false,
            displayText: BuildResources.BuildRepositoryGitHub,
            type: this.key().toLowerCase(),
            icon: "icon-github-logo",
            createNewRepository: () => {
                let newRepository: BuildRepository = <BuildRepository>{
                    type: this.key(),
                    defaultBranch: "master"
                };

                return Q(newRepository);
            },
            createRepositoryViewModel: (definitionId: number, repository: BuildRepository) => {
                let deferred = Q.defer();

                VSS.using(["Build/Scripts/SourceProviders/GitHub.GitHubRepositoryEditor"], (GitHubRepositoryEditor: typeof GitHubRepositoryEditor_NO_REQUIRE) => {
                    deferred.resolve(new GitHubRepositoryEditor.GitHubRepositoryEditorViewModel(definitionId, repository));
                });

                return deferred.promise;
            },
            repositoryBlock: {
                id: "github",
                text: BuildResources.RepositorySourceBlockGithub
            }
        } as any;
    }

    public supportsTrigger(trigger: DefinitionTriggerType): boolean {
        switch (trigger) {
            case DefinitionTriggerType.ContinuousIntegration:
                return true;
            case DefinitionTriggerType.Schedule:
                return true;
            case DefinitionTriggerType.PullRequest:
                return true;
        }
    }

    public getTriggerLabel(trigger: DefinitionTriggerType): string {
        switch (trigger) {
            case DefinitionTriggerType.ContinuousIntegration:
                return BuildResources.CITriggerWithBranchLabel;
            default:
                return "";
        }
    }

    public supportsPolling(): boolean {
        return false;
    }

    public getDefaultPollingInterval(): number {
        return 0;
    }

    public supportsBatchChanges(): boolean {
        return true;
    }

    public supportsBranchFilters(): boolean {
        return true;
    }

    public supportsPathFilters(): boolean {
        return false;
    }

    public getChangeList(tfsContext: TfsContext, repositoryType: string, changeId: string, repoId?: string): IPromise<ChangeList> {
        let deferred = Q.defer<ChangeList>();

        VSS.using(["VersionControl/Scripts/TFS.VersionControl.ClientServices"], (VCClient: typeof VCClient_NO_REQUIRE) => {
            let repoContext = VCClient.getContext(tfsContext);
            repoContext.getClient().beginGetChangeList(repoContext, changeId, 0,
                (fullChangeList: ChangeList) => {
                    deferred.resolve(fullChangeList);
                }, (err: any) => {
                    deferred.reject(err);
                });
        });

        return deferred.promise;
    }
}
