import ko = require("knockout");

import BuildResources = require("Build/Scripts/Resources/TFS.Resources.Build");
import { FilterTypes } from "Build/Scripts/Constants";
import { FilterViewModel } from "Build/Scripts/FilterViewModel";
import RepositoryDesignerViewModel = require("Build/Scripts/RepositoryDesignerViewModel");

import { ArtifactResourceTypes, BuildArtifactConstants } from "Build.Common/Scripts/Generated/TFS.Build2.Common";

import { MarkdownRenderer } from "ContentRendering/Markdown";

import TaskModels = require("DistributedTasksCommon/TFS.Tasks.Models");

import Marked = require("Presentation/Scripts/marked");
import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");

import BuildContracts = require("TFS/Build/Contracts");

import Utils_Array = require("VSS/Utils/Array");
import Utils_Number = require("VSS/Utils/Number");
import Utils_String = require("VSS/Utils/String");

import Constants_Platform = require("VSS/Common/Constants/Platform");
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";

export class RetentionRuleViewModel extends TaskModels.ChangeTrackerModel {
    private _rule: BuildContracts.RetentionPolicy;
    
    /**
     * The number of days to keep.
     */
    public daysToKeep: KnockoutObservable<number>;

    /**
     * The number of days to keep.
     */
    public minimumToKeep: KnockoutObservable<number>;

    /**
     * Whether to keep the build record.
     */
    public deleteBuildRecord: KnockoutObservable<boolean>;

    /**
     * Whether to delete the source label.
     */
    public deleteSourceLabel: KnockoutObservable<boolean>;

    /**
     * Whether to keep the test results associated with build.
     */
    public deleteTestResults: KnockoutObservable<boolean>;

    /**
     * Whether to keep the file share(s) associated with build.
     */
    public deleteFileShare: KnockoutObservable<boolean>;

    /**
     * Whether to keep the symbols associated with the build.
     */
    public deleteSymbols: KnockoutObservable<boolean>;

    /**
     * Delete Test Results help markdown
     */
    public deleteTestResultsHelpMarkDown: string;

    /**
     * Delete Test Results help markdown
     */
    public minimumToKeepHelpMarkDown: KnockoutObservable<string>;

    /**
     * Whether or not the view is selected.
     */
    public selected: KnockoutObservable<boolean>;

    /**
     * The branch filters.
     */
    public branchFilters: KnockoutObservableArray<FilterViewModel>;
    public supportsBranchFilters: KnockoutObservable<boolean>;
    public filePathArtifactsAndSymbolsDeleteFeature: KnockoutObservable<boolean>;

    private repository: RepositoryDesignerViewModel.RepositoryDesignerViewModel;

    constructor(rule: BuildContracts.RetentionPolicy, supportsBranchFilters: KnockoutObservable<boolean>, repository: RepositoryDesignerViewModel.RepositoryDesignerViewModel) {
        super();

        // we need to set the help markdown based on the current value in addition to subscribing for future value changes
        // ko computed doesnt work due to passing in the observable itself
        this.supportsBranchFilters = supportsBranchFilters;

        this.filePathArtifactsAndSymbolsDeleteFeature = ko.observable(FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.FilePathArtifactsAndSymbolsDeleteFeature, false));

        let renderer: (markdown: string) => string;
        if (FeatureAvailabilityService.isFeatureEnabled(Constants_Platform.WebPlatformFeatureFlags.MarkdownRendering)) {
            renderer = (new MarkdownRenderer()).renderHtml;
        }
        else {
            renderer = Marked;
        }
        this.minimumToKeepHelpMarkDown(this.supportsBranchFilters() ? renderer(BuildResources.RetentionMinimumWithBranchesHelpMarkDown) : renderer(BuildResources.RetentionMinimumWithoutBranchesHelpMarkDown));
        this.supportsBranchFilters.subscribe((newValue) => {
            this.minimumToKeepHelpMarkDown(newValue ? Marked(BuildResources.RetentionMinimumWithBranchesHelpMarkDown) : Marked(BuildResources.RetentionMinimumWithoutBranchesHelpMarkDown));
        });

        if (repository) {
            this.repository = repository;

            // update the branch filters when the repository type is changed in the UI
            this._addDisposable(this.repository.selectedRepositoryType.subscribe((newValue: string) => {
                this.updateFilters();
            }));

            // update the branch filter options when the selected repository is changed
            this._addDisposable(this.repository.name.subscribe((newValue) => {
                this.updateFilters();
            }));
        }
        this._update(rule);
    }

    public _update(rule: BuildContracts.RetentionPolicy): void {
        this._rule = rule;
        this.daysToKeep(rule.daysToKeep);
        this.minimumToKeep(rule.minimumToKeep);
        this.deleteBuildRecord(rule.deleteBuildRecord);
        this.deleteSourceLabel(isDeleteSourceLabelSpecified(rule));
        this.deleteTestResults(rule.deleteTestResults);

        // Depending upon the types specified in the rule, set the flags
        this.deleteFileShare((rule.artifactTypesToDelete != null) && (rule.artifactTypesToDelete.indexOf(ArtifactResourceTypes.FilePath) > -1));
        this.deleteSymbols((rule.artifactTypesToDelete != null) && (rule.artifactTypesToDelete.indexOf(ArtifactResourceTypes.SymbolStore) > -1));

        this.branchFilters([]);

        // initialize artifacts on the rule so that build definitions that existed before we introduced artifacts don't show as dirty in the UI
        if (!rule.artifacts) {
            rule.artifacts = [];
        }

        rule.branches.forEach((branch: string) => {
            if (this.repository) {
                this.branchFilters.push(new FilterViewModel(FilterTypes.Branch, branch, this.repository.getValue()));
            }
            else {
                this.branchFilters.push(new FilterViewModel(FilterTypes.Branch, branch, null));
            }
        });
    }

    public revert(): void {
        this._update(this._rule);
    }

    /**
     * Extracts the data contract from the viewmodel
     */
    public getValue(): BuildContracts.RetentionPolicy {
        var retentionPolicy: BuildContracts.RetentionPolicy = {
            branches: this.branchFilters()
                .map((bf: FilterViewModel) => {
                    // Convert viewmodel to value
                    return bf.getValue();
                }),

            deleteBuildRecord: this.deleteBuildRecord(),
            deleteTestResults: this.deleteTestResults(),
            daysToKeep: this.daysToKeep(),
            minimumToKeep: this.minimumToKeep(),
            artifacts: [],
            artifactTypesToDelete: []
        };

        if (this.deleteSourceLabel()) {
            retentionPolicy.artifacts.push(BuildArtifactConstants.SourceLabel);
        }
        if (this.deleteFileShare()) {
            retentionPolicy.artifactTypesToDelete.push(ArtifactResourceTypes.FilePath);
        }
        if (this.deleteSymbols()) {
            retentionPolicy.artifactTypesToDelete.push(ArtifactResourceTypes.SymbolStore);
        }
        return retentionPolicy;
    }

    public getBranchesAsString(): string {
        var rtn = $.map(this.branchFilters(), (branch: FilterViewModel) => {
            if (branch.getValue()) {
                return branch.getValue();
            }
        }).join(", ");

        return rtn == "+refs/heads/*" ? BuildResources.RetentionTabDefaultBranchesLabel : rtn;
    }

    public _isDirty(): boolean {
        var value = this.getValue();

        if (!this._rule) {
            return false;
        }

        if (!(this._rule.daysToKeep == value.daysToKeep &&
            this._rule.minimumToKeep == value.minimumToKeep &&
            this._rule.deleteBuildRecord == value.deleteBuildRecord &&
            this._rule.deleteTestResults == value.deleteTestResults &&
            Utils_Array.arrayEquals(this._rule.artifacts, value.artifacts, (a, b) => Utils_String.localeIgnoreCaseComparer(a, b) === 0) &&
            Utils_Array.arrayEquals(this._rule.artifactTypesToDelete, value.artifactTypesToDelete, (a, b) => Utils_String.localeIgnoreCaseComparer(a, b) === 0))) {

            return true;
        }

        if (this.supportsBranchFilters()) {
            return !Utils_Array.arrayEquals(this._rule.branches, this.branchFilters(),
                (s: string, t: FilterViewModel) => {
                    return t.equals(s);
                }, true);
        }

        return false;
    }

    public _isInvalid(): boolean {
        var rtn = false;
        if (this.supportsBranchFilters()) {
            if (this.noBranchFilters()) {
                rtn = true;
            }

            this.branchFilters().forEach((filter) => {
                if (filter._isInvalid()) {
                    rtn = true;
                }
            });
        }

        if (this._daysToKeepInvalid() || this._minimumToKeepInvalid()) {
            rtn = true;
        }

        return rtn;
    }

    public noBranchFilters(): boolean {
        return this.branchFilters().length == 0;
    }

    public _daysToKeepInvalid(): boolean {
        // days to keep box can't be empty
        var daysToKeep = this.daysToKeep();
        var strDaysToKeep = daysToKeep.toString().trim();
        if (strDaysToKeep.length === 0) {
            return true;
        }

        // days to keep must be a positive number
        if (!Utils_Number.isPositiveNumber(daysToKeep)) {
            return true;
        }

        return false;
    }

    public _minimumToKeepInvalid(): boolean {
        // minimum to keep box can't be empty
        var minToKeep = this.minimumToKeep();
        var strMinimumToKeep = minToKeep.toString().trim();
        if (strMinimumToKeep.length === 0) {
            return true;
        }

        // days to keep must be a nonnegative number
        // isPositiveNumber handles the case where it's a letter/other
        if (!(Utils_Number.isPositiveNumber(minToKeep) ||
            Utils_Number.defaultComparer(minToKeep, 0) === 0)) {
            return true;
        }

        return false;
    }

    _initializeObservables(): void {
        super._initializeObservables();

        this.branchFilters = ko.observableArray([]);
        this.supportsBranchFilters = ko.observable(false);
        this.daysToKeep = ko.observable(30);
        this.minimumToKeep = ko.observable(1);
        this.minimumToKeepHelpMarkDown = ko.observable("");
        this.deleteBuildRecord = ko.observable(true);
        this.deleteSourceLabel = ko.observable(true);
        this.deleteFileShare = ko.observable(true);
        this.deleteSymbols = ko.observable(true);
        this.deleteTestResultsHelpMarkDown = Marked(BuildResources.RetentionTabDeleteTestResultsHoverWarningMessage);
        this.deleteTestResults = ko.observable(true);
        this.selected = ko.observable(false);
    }

    public addFilter(rule: RetentionRuleViewModel, evt: JQueryEventObject): void {
        rule.branchFilters.push(new FilterViewModel(FilterTypes.Branch, "+" + this.repository.getDefaultBranchFilter(), this.repository.getValue()));
    }

    public removeFilter(filter: FilterViewModel, evt: JQueryEventObject): void {
        var context = <RetentionRuleViewModel>(<KnockoutBindingContext>ko.contextFor(evt.target)).$parent;
        context.branchFilters.remove(filter);
    }

    public equals(retRule: BuildContracts.RetentionPolicy): boolean {
        var artifacts: string[] = [];
        if (this.deleteSourceLabel()) {
            artifacts.push(BuildArtifactConstants.SourceLabel);
        }

        var fileShareValueAreEqual = true;
        var symbolStoreValueAreEqual = true;
        if (retRule.artifactTypesToDelete != null) {

            // if the "deleteFileShare" value is true and the artifactTypesToDelete contains it or vice versa,
            // they are equivalent
            fileShareValueAreEqual = (this.deleteFileShare() && (retRule.artifactTypesToDelete.indexOf(ArtifactResourceTypes.FilePath) > -1)) ||
                                     (!this.deleteFileShare() && (retRule.artifactTypesToDelete.indexOf(ArtifactResourceTypes.FilePath) == -1));

            // if the "deleteSymbolStore" value is true and the artifactTypesToDelete contains it or vice versa,
            // they are equivalent
            symbolStoreValueAreEqual = (this.deleteSymbols() && (retRule.artifactTypesToDelete.indexOf(ArtifactResourceTypes.SymbolStore) > -1)) ||
                                       (!this.deleteSymbols() && (retRule.artifactTypesToDelete.indexOf(ArtifactResourceTypes.SymbolStore) == -1));
        }

        if (!(retRule.deleteBuildRecord == this.deleteBuildRecord() &&
            retRule.deleteTestResults == this.deleteTestResults() &&
            fileShareValueAreEqual &&
            symbolStoreValueAreEqual &&
            retRule.minimumToKeep == this.minimumToKeep() &&
            Utils_Array.arrayEquals(artifacts, retRule.artifacts, (a, b) => Utils_String.localeIgnoreCaseComparer(a, b) === 0) &&
            this.daysToKeep() == retRule.daysToKeep)) {
            return false;
        }

        return Utils_Array.arrayEquals(this.branchFilters(), retRule.branches,
            (s: FilterViewModel, t: string) => {
                return s.equals(t);
            }, true);
    }

    public _onTreeIconClick(rule: RetentionRuleViewModel, evt: JQueryEventObject): void {
        rule.selected(!rule.selected());
    }

    private updateFilters() {
        var filters = this.branchFilters()
            .map((bf: FilterViewModel) => {
                return bf.getValue();
            });

        this.branchFilters([]);
        var displayedRepo = this.repository.getValue();

        filters.forEach((branch: string) => {
            // if the repository has been loaded in the UI, use that version
            if (displayedRepo) {
                this.branchFilters.push(new FilterViewModel(FilterTypes.Branch, branch, displayedRepo));
            }
            // if the repository hasn't been loaded in the UI yet (and is therefore undefined), use the saved version.
            else {
                this.branchFilters.push(new FilterViewModel(FilterTypes.Branch, branch, this.repository.getValue()));
            }
        });
    }
}

function isDeleteSourceLabelSpecified(rule: BuildContracts.RetentionPolicy) {
    if (rule.artifacts) {
        return rule.artifacts.filter((value) => Utils_String.localeIgnoreCaseComparer(value, BuildArtifactConstants.SourceLabel) === 0).length > 0;
    }
    else {
        return false;
    }
}
