import ko = require("knockout");
import Q = require("q");

import BuildResources = require("Build/Scripts/Resources/TFS.Resources.Build");
import Filters_NO_REQUIRE = require("Build/Scripts/FilterViewModel");
import SourceOptions = require("Build/Scripts/IQueueDialogSourceOptions");
import SourceProvider = require("Build/Scripts/SourceProviders/SourceProvider");

import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");

import BuildContracts = require("TFS/Build/Contracts");

import {RepositoryContext} from "VersionControl/Scripts/RepositoryContext";

import Adapters_Knockout = require("VSS/Adapters/Knockout");
import Combos = require("VSS/Controls/Combos");
import Controls = require("VSS/Controls");
import VSS = require("VSS/VSS");

export class BaseQueueDialogSourceOptions {
    public dialogTemplate: string;

    constructor(dialogTemplate: string) {
        this.dialogTemplate = dialogTemplate;
    }
}

export class BaseSourceProvider {
    public isEmptyBranch(value: string): boolean {
        return !value;
    }

    public canLinkBranch(): boolean {
        return false;
    }

    public onBranchClick(tfsContext: TFS_Host_TfsContext.TfsContext, projectId: string, repositoryId: string, repositoryType: string, branchName: string): void {
    }

    public getSourceBranchLink(tfsContext: TFS_Host_TfsContext.TfsContext, projectId: string, repositoryId: string, repositoryType: string, branchName: string): string {
        return "";
    }

    public getSourceVersionLink(tfsContext: TFS_Host_TfsContext.TfsContext, build: BuildContracts.Build): string {
        return "";
    }

    public getContentUrl(tfsContext: TFS_Host_TfsContext.TfsContext, build: BuildContracts.Build, repo: string, sourcePath: string, lineNumber: number, columnNumber: number, type: BuildContracts.IssueType, message: string): string {
        return "";
    }

    public getChangeUrl(tfsContext: TFS_Host_TfsContext.TfsContext, build: BuildContracts.Build, change: BuildContracts.Change): string {
        return "";
    }

    public getFilterEditor(filterType: string): IPromise<any> {
        var deferred = Q.defer();

        VSS.using(["Build/Scripts/DefinitionDesigner.Filters"], (Filters: typeof Filters_NO_REQUIRE) => {
            deferred.resolve(Filters.DefaultFilterEditorControl);
        });

        return deferred.promise;
    }

    public getQueueBuildDialogOptions(tfsContext: TFS_Host_TfsContext.TfsContext, repository: BuildContracts.BuildRepository): IPromise<SourceOptions.IQueueDialogSourceOptions> {
        return Q(new BaseQueueDialogSourceOptions("queue_definition_dialog"));
    }

    public getRepoName(tfsContext: TFS_Host_TfsContext.TfsContext, repositoryId: string): IPromise<string> {
        return Q("");
    }

    public getSourceVersionText(build: BuildContracts.Build) {
        return build.sourceVersion || build.sourceBranch;
    }

    public getScheduleTriggerHelpMarkDown(): string {
        return BuildResources.ScheduledTriggerHelpText;
    }

    public getCITriggerBranchHelpMarkDown(): string {
        return BuildResources.CITriggerHelpText;
    }

    public getCITriggerPathHelpMarkDown(): string {
        return BuildResources.CITriggerHelpText;
    }

    public getSourceBranch(build: BuildContracts.Build): string {
        return build.sourceBranch || "";
    }

    public getTriggerLabel(trigger: BuildContracts.DefinitionTriggerType): string {
        return "";
    }

    public getRepositories(tfsContext: TFS_Host_TfsContext.TfsContext): IPromise<SourceProvider.IRepository[]> {
        return Q([]);
    }

    public getRepositoryContext(tfsContext: TFS_Host_TfsContext.TfsContext, repositoryId: string, repositoryName: string): RepositoryContext {
        return null;
    }

    public getRepositoryLink(tfsContext: TFS_Host_TfsContext.TfsContext, repositoryId: string, repositoryName: string): string {
        return "";
    }

    public getBranchIconClass(sourceBranch: string): string {
        return "bowtie-icon bowtie-tfvc-branch";
    }

    public getChangeIconClass(change: BuildContracts.Change): string {
        return "bowtie-icon bowtie-tfvc-commit";
    }

    public getRepoIconClass(): string {
        return "";
    }

    public onSourceVersionClick(tfsContext: TFS_Host_TfsContext.TfsContext, build: BuildContracts.Build) {
    }

    public onChangeClick(tfsContext: TFS_Host_TfsContext.TfsContext, build: BuildContracts.Build, change: BuildContracts.Change) {
    }
}

/**
 * Wrapper view model for repository editors.
 */
export class RepositoryEditorWrapperViewModel extends Adapters_Knockout.TemplateViewModel {
    public baseViewModel: KnockoutObservable<IRepositoryEditorViewModel>;
    constructor(baseViewModel: IRepositoryEditorViewModel) {
        super();
        this.baseViewModel = ko.observable(baseViewModel);
    }
}

export class RepositoryEditorControl extends Adapters_Knockout.TemplateControl<RepositoryEditorWrapperViewModel> {
    private _cleanCombo: Combos.Combo;

    constructor(viewModel: RepositoryEditorWrapperViewModel, options?: any) {
        super(viewModel, options);
    }

    initialize(): void {
        super.initialize();

        var viewModel = this.getViewModel().baseViewModel(),
            cleanElement = this.getElement().find(".repository-clean");

        // add clean combo
        this._cleanCombo = <Combos.Combo>Controls.BaseControl.createIn(Combos.Combo, cleanElement, {
            source: [
                "true",
                "false",
            ],
            change: function (e) {
                // set viewmodel observable
                viewModel.clean(this.getText());
            },
            enabled: true
        });

        this._cleanCombo.setText(viewModel.clean());
    }

    public dispose(): void {
        if (this._cleanCombo) {
            this._cleanCombo.dispose();
            this._cleanCombo = null;
        }

        super.dispose();
    }
}
