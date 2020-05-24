/// <reference types="jquery" />
/// <reference path='../Interfaces.d.ts' />

import Q = require("q");

import BaseSourceProvider = require("Build/Scripts/SourceProviders/BaseSourceProvider");
import BuildResources = require("Build/Scripts/Resources/TFS.Resources.Build");
import RepositoryFactory = require("Build/Scripts/RepositoryFactory");
import GitRepositoryEditor_NO_REQUIRE = require("Build/Scripts/SourceProviders/Git.GitRepositoryEditor");
import SourceProvider = require("Build/Scripts/SourceProviders/SourceProvider");

import {RepositoryTypes} from "Build.Common/Scripts/Generated/TFS.Build2.Common";

import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");

import BuildContracts = require("TFS/Build/Contracts");

import VCClient_NO_REQUIRE = require("VersionControl/Scripts/TFS.VersionControl.ClientServices");
import VCLegacyContracts = require("VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts");

import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import VSS = require("VSS/VSS");

var domElem = Utils_UI.domElem;

export class GitSourceProvider extends BaseSourceProvider.BaseSourceProvider implements SourceProvider.ISourceProvider {
    public initialize(options: any) {
    }

    public key(): string {
        return RepositoryTypes.Git;
    }

    public isEnabled(): boolean {
        return true;
    }

    public getSourceVersionText(build: BuildContracts.Build) {
        if (build.sourceVersion) {
            return build.sourceVersion.slice(0, 7);
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

    public getSourceBranchLabel(sourceBranch: string): string {
        return BuildResources.BuildSummarySourceBranchLabel;
    }

    public createRepositoryFactory(tfsContext: TFS_Host_TfsContext.TfsContext): RepositoryFactory.RepositoryFactory {
        return {
            isPrimary: false,
            displayText: BuildResources.BuildRepositoryGit,
            type: this.key().toLowerCase(),
            icon: "icon-git-logo",
            createNewRepository: () => {
                var newRepository: BuildContracts.BuildRepository = <BuildContracts.BuildRepository>{
                    type: this.key(),
                    defaultBranch: "master"
                };

                return Q(newRepository);
            },
            createRepositoryViewModel: (definitionId: number, repository: BuildContracts.BuildRepository) => {
                let deferred = Q.defer();

                VSS.using(["Build/Scripts/SourceProviders/Git.GitRepositoryEditor"], (GitRepositoryEditor: typeof GitRepositoryEditor_NO_REQUIRE) => {
                    deferred.resolve(new GitRepositoryEditor.GitRepositoryEditorViewModel(repository));
                });

                return deferred.promise;
            },
            repositoryBlock: {
                id: "git",
                text: BuildResources.RepositorySourceBlockGit
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

    public supportsPolling(): boolean {
        return true;
    }

    public getDefaultPollingInterval(): number {
        return 180;
    }

    public supportsBatchChanges(): boolean {
        return false;
    }

    public supportsBranchFilters(): boolean {
        return true;
    }

    public supportsPathFilters(): boolean {
        return false;
    }

    public getChangeList(tfsContext: TFS_Host_TfsContext.TfsContext, repositoryType: string, changeId: string, repoId?: string): IPromise<VCLegacyContracts.ChangeList> {
        let deferred = Q.defer<VCLegacyContracts.ChangeList>();

        VSS.using(["VersionControl/Scripts/TFS.VersionControl.ClientServices"], (VCClient: typeof VCClient_NO_REQUIRE) => {
            let repoContext = VCClient.getContext(tfsContext);
            repoContext.getClient().beginGetChangeList(repoContext, changeId, 0,
                (fullChangeList: VCLegacyContracts.ChangeList) => {
                    deferred.resolve(fullChangeList);
                }, (err: any) => {
                    deferred.reject(err);
                });
        });

        return deferred.promise;
    }
}
