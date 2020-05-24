/// <reference types="jquery" />
/// <reference path='../Interfaces.d.ts' />

import ko = require("knockout");
import Q = require("q");

import BaseSourceProvider = require("Build/Scripts/SourceProviders/BaseSourceProvider");
import BuildResources = require("Build/Scripts/Resources/TFS.Resources.Build");
import RepositoryFactory = require("Build/Scripts/RepositoryFactory");
import SourceOptions = require("Build/Scripts/IQueueDialogSourceOptions");
import SourceProvider = require("Build/Scripts/SourceProviders/SourceProvider");
import TfvcCommon = require("Build/Scripts/SourceProviders/TfsVersionControl.Common");
import TfvcFilterEditor_NO_REQUIRE = require("Build/Scripts/SourceProviders/TfsVersionControl.FilterEditor");
import TfvcRepositoryEditor_NO_REQUIRE = require("Build/Scripts/SourceProviders/TfsVersionControl.TfvcRepositoryEditor");

import {RepositoryProperties, RepositoryTypes} from "Build.Common/Scripts/Generated/TFS.Build2.Common";

import Marked = require("Presentation/Scripts/marked");
import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");

import BuildContracts = require("TFS/Build/Contracts");
import VCContracts = require("TFS/VersionControl/Contracts");

import * as VersionControlUrls from "VersionControl/Scripts/VersionControlUrls";
import { getContext } from "VersionControl/Scripts/TFS.VersionControl.ClientServices";
import VCHistoryDialogs_NO_REQUIRE = require("VersionControl/Scripts/Controls/HistoryDialogs");
import VCLegacyContracts = require("VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts");
import VCSpecs = require("VersionControl/Scripts/TFS.VersionControl.VersionSpecs");
import { ChangesetArtifact } from "VersionControl/Scripts/ChangesetArtifact";
import {TfvcRepositoryContext} from "VersionControl/Scripts/TfvcRepositoryContext";

import Events_Action = require("VSS/Events/Action");
import Utils_Core = require("VSS/Utils/Core");
import Utils_UI = require("VSS/Utils/UI");
import VSS = require("VSS/VSS");

import Constants_Platform = require("VSS/Common/Constants/Platform");
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { MarkdownRenderer } from "ContentRendering/Markdown";

var domElem = Utils_UI.domElem;
var delegate = Utils_Core.delegate;

export class TfsVersionControlSourceProvider extends BaseSourceProvider.BaseSourceProvider implements SourceProvider.ISourceProvider {
    private _projectInfo: VCContracts.VersionControlProjectInfo;
    public initialize(options: any) {
        this._projectInfo = options;
    }

    public key(): string {
        return RepositoryTypes.TfsVersionControl;
    }

    public isEnabled(): boolean {
        return this._projectInfo.supportsTFVC;
    }

    public getSourceVersionGridCell(build: BuildContracts.Build): JQuery {
        var link = $(domElem("a")).text(this.getSourceVersionText(build));
        if (build.sourceVersion) {
            link.click(() => {
                var tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
                this._executeTfvcArtifact(tfsContext, build.sourceVersion);
            });
        }
        return link;
    }

    public getSourceVersionText(build: BuildContracts.Build) {
        try {
            return VCSpecs.VersionSpec.parse(build.sourceVersion).toVersionString();
        }
        catch (err) {
            return build.sourceVersion || "";
        }
    }

    public getChangeText(change: BuildContracts.Change) {
        if (change && change.id) {
            return VCSpecs.VersionSpec.parse(change.id).toVersionString();
        }
        else {
            return "";
        }
    }

    public canLinkChange(): boolean {
        return true;
    }

    public canLinkBranch(): boolean {
        return true;
    }

    public getRepoIconClass(): string {
        return "bowtie-tfvc-repo";
    }

    public onBranchClick(tfsContext: TFS_Host_TfsContext.TfsContext, projectId: string, repositoryId: string, repositoryType: string, branchName: string): void {
        let url = this.getSourceBranchLink(tfsContext, projectId, repositoryId, repositoryType, branchName);
        // open in a new tab. this is consistent with the behavior of the GitRefArtifact
        Events_Action.getService().performAction(Events_Action.CommonActions.ACTION_WINDOW_OPEN, {
            url: url
        });
    }

    public getSourceBranchLink(tfsContext: TFS_Host_TfsContext.TfsContext, projectId: string, repositoryId: string, repositoryType: string, branchName: string): string {
        let repositoryContext = getContext(tfsContext);
        let url = VersionControlUrls.getExplorerUrl(repositoryContext, branchName, null, {});

        // link to shelveset if branch is shelveset
        let semicolonIndex = branchName.indexOf(";");
        if (semicolonIndex >= 0) {
            url = VersionControlUrls.getShelvesetUrl(branchName.substring(0, semicolonIndex), branchName.substring(semicolonIndex + 1));
        }

        return url;
    }

    public getFilterEditor(filterType: string): IPromise<any> {
        var deferred = Q.defer();

        VSS.using(["Build/Scripts/SourceProviders/TfsVersionControl.FilterEditor"], (TfvcFilterEditor: typeof TfvcFilterEditor_NO_REQUIRE) => {
            deferred.resolve(TfvcFilterEditor.TfvcFilterEditorControl);
        });

        return deferred.promise;
    }

    public getRepositoryContext(tfsContext: TFS_Host_TfsContext.TfsContext, repositoryId: string, repositoryName: string, projectId?: string): TfvcRepositoryContext {
        return new TfvcRepositoryContext(tfsContext, tfsContext.navigation.project);
    }

    public getRepositoryLink(tfsContext: TFS_Host_TfsContext.TfsContext, repositoryId: string, repositoryName: string): string {
        let repositoryContext = this.getRepositoryContext(tfsContext, repositoryId, repositoryName, null);
        return VersionControlUrls.getExplorerUrl(repositoryContext);
    }

    public getSourceBranchLabel(sourceBranch: string): string {
        if (sourceBranch.indexOf(";") >= 0) {
            return BuildResources.BuildSummarySourceShelvesetLabel;
        }
        else {
            return BuildResources.BuildSummarySourceBranchLabel;
        }
    }

    public isEmptyBranch(value: string): boolean {
        return !value || value === TfvcCommon.defaultTfvcPrefix;
    }

    public getQueueBuildDialogOptions(tfsContext: TFS_Host_TfsContext.TfsContext, repository: BuildContracts.BuildRepository): IPromise<SourceOptions.IQueueDialogSourceOptions> {
        return Q(new TfVcQueueDialogSourceOptions(repository.defaultBranch));
    }

    public createRepositoryFactory(tfsContext: TFS_Host_TfsContext.TfsContext): RepositoryFactory.RepositoryFactory {
        return {
            isPrimary: true,
            displayText: BuildResources.BuildRepositoryTFVC,
            type: this.key().toLowerCase(),
            icon: "icon-open-visualstudio",
            createNewRepository: () => {
                var newRepository: BuildContracts.BuildRepository = <BuildContracts.BuildRepository>{
                    type: this.key(),
                    properties: {},

                    // defaulting to $/currentproject for now
                    rootFolder: TfvcCommon.defaultTfvcPrefix + tfsContext.navigation.project,

                    // collection url
                    url: tfsContext.navigation.collection.uri,
                    // project name is bound to the repository name
                    name: tfsContext.navigation.project
                };

                newRepository.properties[RepositoryProperties.LabelSources] = BuildContracts.BuildResult.None.toString();
                newRepository.properties[RepositoryProperties.LabelSourcesFormat] = TfvcCommon.defaultSourceLabelFormat;

                return Q(newRepository);
            },
            createRepositoryViewModel: (definitionId: number, repository: BuildContracts.BuildRepository) => {
                var deferred = Q.defer();

                VSS.using(["Build/Scripts/SourceProviders/TfsVersionControl.TfvcRepositoryEditor"], (TfvcRepositoryEditor: typeof TfvcRepositoryEditor_NO_REQUIRE) => {
                    deferred.resolve(new TfvcRepositoryEditor.TfvcRepositoryEditorViewModel(repository));
                });

                return deferred.promise;
            },
            // Project repository block includes this, so no block for this
            repositoryBlock: null
        } as any;
    }

    public supportsTrigger(trigger: BuildContracts.DefinitionTriggerType): boolean {
        switch (trigger) {
            case BuildContracts.DefinitionTriggerType.ContinuousIntegration:
                return true;
            case BuildContracts.DefinitionTriggerType.GatedCheckIn:
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
        return false;
    }

    public getDefaultPollingInterval(): number {
        return 0;
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

    public getScheduleTriggerHelpMarkDown(): string {
        return ""; // not applicable to TFVC
    }

    public getCITriggerPathHelpMarkDown(): string {
        return BuildResources.CITriggerHelpTextTfvc;
    }

    public onSourceVersionClick(tfsContext: TFS_Host_TfsContext.TfsContext, build: BuildContracts.Build): void {
        let sourceVersion = build.sourceVersion;
        if (sourceVersion) {
            this._executeTfvcArtifact(tfsContext, sourceVersion);
        }
    }

    public getSourceVersionLink(tfsContext: TFS_Host_TfsContext.TfsContext, build: BuildContracts.Build): string {
        return this._getChangeUrl(tfsContext, build.sourceVersion);
    }

    public onChangeClick(tfsContext: TFS_Host_TfsContext.TfsContext, build: BuildContracts.Build, change: BuildContracts.Change) {
        this._executeTfvcArtifact(tfsContext, change.id);
    }

    public getChangeUrl(tfsContext: TFS_Host_TfsContext.TfsContext, build: BuildContracts.Build, change: BuildContracts.Change): string {
        return this._getChangeUrl(tfsContext, change.id);
    }

    public getChangeList(tfsContext: TFS_Host_TfsContext.TfsContext, repositoryType: string, changeId: string, repoId?: string): IPromise<VCLegacyContracts.ChangeList> {
        let deferred = Q.defer<VCLegacyContracts.ChangeList>();

        let repoContext = getContext(tfsContext);
        repoContext.getClient().beginGetChangeList(repoContext, changeId, 0,
            (fullChangeList: VCLegacyContracts.ChangeList) => {
                deferred.resolve(fullChangeList);
            }, (err: any) => {
                deferred.reject(err);
            });

        return deferred.promise;
    }

    private _executeTfvcArtifact(tfsContext: TFS_Host_TfsContext.TfsContext, versionString: string): void {
        let versionSpec = VCSpecs.VersionSpec.parse(versionString);

        if (versionSpec instanceof VCSpecs.ChangesetVersionSpec) {
            let artifact = new ChangesetArtifact(versionSpec);
            artifact.execute(tfsContext.contextData);
        }
        else if (versionSpec instanceof VCSpecs.LatestVersionSpec) {
            window.open(tfsContext.getPublicActionUrl("index", "versionControl"), "_blank");
        }
    }

    private _getChangeUrl(tfsContext: TFS_Host_TfsContext.TfsContext, sourceVersion: string): string {
        if (sourceVersion) {
            let versionSpec = VCSpecs.VersionSpec.parse(sourceVersion);

            if (versionSpec instanceof VCSpecs.ChangesetVersionSpec) {
                let artifact = new ChangesetArtifact(versionSpec);
                return artifact.getUrl(tfsContext.contextData);
            }
            else if (versionSpec instanceof VCSpecs.LatestVersionSpec) {
                return tfsContext.getPublicActionUrl("index", "versionControl");
            }
        }

        return "";
    }
}

export class TfVcQueueDialogSourceOptions extends BaseSourceProvider.BaseQueueDialogSourceOptions implements SourceOptions.IQueueDialogSourceOptions {
    public selectedBranch: KnockoutObservable<string> = ko.observable("");
    public shelvesetName: KnockoutObservable<string> = ko.observable("");
    public sourceBranchLabel: KnockoutObservable<string> = ko.observable(BuildResources.BuildSummarySourceBranchLabel);
    public sourceVersionHelpMarkDown: string;

    constructor(defaultBranch: string) {
        super("tfvc_queue_definition_dialog");


        if (FeatureAvailabilityService.isFeatureEnabled(Constants_Platform.WebPlatformFeatureFlags.MarkdownRendering)) {
            let renderer = new MarkdownRenderer();
            this.sourceVersionHelpMarkDown = renderer.renderHtml(BuildResources.QueueDefinitionDialogSourceVersionHelpMarkDownTfvc);
        }
        else {
            this.sourceVersionHelpMarkDown = Marked(BuildResources.QueueDefinitionDialogSourceVersionHelpMarkDownTfvc);
        }

        this.selectedBranch(defaultBranch);

        this.shelvesetName.subscribe((newValue) => {
            this.selectedBranch(newValue === "" ? TfvcCommon.defaultTfvcPrefix : newValue);
        });
    }

    public onShelvePickerClick() {
        VSS.using(["VersionControl/Scripts/Controls/HistoryDialogs"], (VCHistoryDialogs: typeof VCHistoryDialogs_NO_REQUIRE) => {
            VCHistoryDialogs.Dialogs.shelvesetPicker({
                tfsContext: TFS_Host_TfsContext.TfsContext.getDefault(),
                okCallback: (shelveset) => {
                    var shelvesetName = shelveset ? (shelveset.shelvesetName + ";" + shelveset.owner) : "";
                    // this refers to QueueDefinitionDialogModel
                    var model: any = this;
                    model.sourceOptions.shelvesetName(shelvesetName);
                }
            });
        });
    }
}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TfsVersionControl", exports);
