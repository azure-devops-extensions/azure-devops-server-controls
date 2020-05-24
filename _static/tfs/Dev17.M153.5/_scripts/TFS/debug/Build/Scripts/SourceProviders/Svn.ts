/// <reference types="jquery" />
/// <reference path='../Interfaces.d.ts' />

import Q = require("q");

import BaseSourceProvider = require("Build/Scripts/SourceProviders/BaseSourceProvider");
import BuildResources = require("Build/Scripts/Resources/TFS.Resources.Build");
import RepositoryFactory = require("Build/Scripts/RepositoryFactory");
import SourceProvider = require("Build/Scripts/SourceProviders/SourceProvider");
import SvnFilterEditor_NO_REQUIRE = require("Build/Scripts/SourceProviders/Svn.FilterEditor");
import SvnRepositoryEditor_NO_REQUIRE = require("Build/Scripts/SourceProviders/Svn.SvnRepositoryEditor");

import {RepositoryTypes} from "Build.Common/Scripts/Generated/TFS.Build2.Common";

import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");

import BuildContracts = require("TFS/Build/Contracts");

import VCLegacyContracts = require("VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts");

import FeatureAvailability_Services = require("VSS/FeatureAvailability/Services");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import VSS = require("VSS/VSS");

var domElem = Utils_UI.domElem;

export class SvnSourceProvider extends BaseSourceProvider.BaseSourceProvider implements SourceProvider.ISourceProvider {
    public initialize(options: any) {
    }

    public key(): string {
        return RepositoryTypes.Svn;
    }

    public isEnabled(): boolean {
        return FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.WebAccessBuildvNextSvnRepository);
    }

    public getSourceVersionText(build: BuildContracts.Build) {
        if (build.sourceVersion) {
            return build.sourceVersion || "";
        }
        else {
            return "";
        }
    }

    public getSourceVersionGridCell(build: BuildContracts.Build): JQuery {
        return $(domElem("span")).text(this.getSourceVersionText(build));
    }

    public getChangeText(change: BuildContracts.Change) {
        if (change && change.id) {
            return Utils_String.format(BuildResources.BuildDetailViewCommitId, change.id.slice(0, 7));
        }
        else {
            return "";
        }
    }

    public canLinkChange(): boolean {
        return false;
    }

    public getFilterEditor(): IPromise<any> {
        var deferred = Q.defer();

        VSS.using(["Build/Scripts/SourceProviders/Svn.FilterEditor"], (SvnFilterEditor: typeof SvnFilterEditor_NO_REQUIRE) => {
            deferred.resolve(SvnFilterEditor.SvnFilterEditorControl);
        });

        return deferred.promise;
    }

    public getSourceBranchLabel(sourceBranch: string): string {
        return BuildResources.BuildSummarySourceBranchLabel;
    }

    public createRepositoryFactory(tfsContext: TFS_Host_TfsContext.TfsContext): RepositoryFactory.RepositoryFactory {
        return {
            isPrimary: false,
            displayText: BuildResources.BuildRepositorySvn,
            type: this.key().toLowerCase(),
            icon: "icon-open-visualstudio",
            createNewRepository: () => {
                var newRepository: BuildContracts.BuildRepository = <BuildContracts.BuildRepository>{
                    type: this.key(),
                    defaultBranch: "trunk"
                };

                return Q(newRepository);
            },
            createRepositoryViewModel: (definitionId: number, repository: BuildContracts.BuildRepository) => {
                let deferred = Q.defer();

                VSS.using(["Build/Scripts/SourceProviders/Svn.SvnRepositoryEditor"], (SvnRepositoryEditor: typeof SvnRepositoryEditor_NO_REQUIRE) => {
                    deferred.resolve(new SvnRepositoryEditor.SvnRepositoryEditorViewModel(repository));
                });

                return deferred.promise;
            },
            repositoryBlock: {
                id: "svn",
                text: BuildResources.RepositorySourceBlockSvn
            }
        } as any;
    }

    public supportsTrigger(trigger: BuildContracts.DefinitionTriggerType): boolean {
        switch (trigger) {
            case BuildContracts.DefinitionTriggerType.ContinuousIntegration:
                return true;
            case BuildContracts.DefinitionTriggerType.Schedule:
                return true;
        }
    }

    public getTriggerLabel(trigger: BuildContracts.DefinitionTriggerType): string {
        switch (trigger) {
            case BuildContracts.DefinitionTriggerType.ContinuousIntegration:
                return BuildResources.CITriggerWithRepoLabel;
            default:
                return "";
        }
    }

    public supportsPolling(): boolean {
        return true;
    }

    public getDefaultPollingInterval(): number {
        return 180;
    }

    public supportsBatchChanges(): boolean {
        return true;
    }

    public supportsBranchFilters(): boolean {
        return false;
    }

    public supportsPathFilters(): boolean {
        return true;
    }

    public getCITriggerPathHelpMarkDown(): string {
        return BuildResources.CITriggerHelpTextSvn;
    }

    public getScheduleTriggerHelpMarkDown(): string {
        return BuildResources.ScheduledTriggerHelpTextSvn;
    }

    public getChangeList(tfsContext: TFS_Host_TfsContext.TfsContext, repositoryType: string, changeId: string, repoId?: string): IPromise<VCLegacyContracts.ChangeList> {
        return Q(<VCLegacyContracts.ChangeList>{ changes: [] });
    }
}
