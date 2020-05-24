import * as ko from "knockout";

import * as BuildResources from "Build/Scripts/Resources/TFS.Resources.Build";

import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";

import { BuildResultsSummaryTabSectionIds } from "TFS/Build/ExtensionContracts";

import { Contribution } from "VSS/Contributions/Contracts";
import { ExtensionHelper } from "VSS/Contributions/Services";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";

export var WellKnownSections = {
    BuildDetails: { key: BuildResultsSummaryTabSectionIds.BuildDetails, template: "buildvnext_details_summary_tab_builddetails", order: 100, column: 0 },
    BuildIssues: { key: BuildResultsSummaryTabSectionIds.BuildIssues, template: "buildvnext_details_summary_tab_issues", order: 300, column: 0 },
    AssociatedWorkItem: { key: BuildResultsSummaryTabSectionIds.AssociatedWorkItem, template: "buildvnext_details_summary_tab_associatedWorkitems", order: 500, column: 0 },
    AssociatedChangeset: { key: BuildResultsSummaryTabSectionIds.AssociatedChangeset, template: "buildvnext_details_summary_tab_changes", order: 400, column: 0 },
    DiagnosticLogs: { key: BuildResultsSummaryTabSectionIds.DiagnosticLogs, template: "buildvnext_details_summary_tab_diagnosticlogs", order: 600, column: 0 },

    TestSummary: { key: BuildResultsSummaryTabSectionIds.TestSummary, template: "buildvnext_details_summary_tab_tests", order: 100, column: 1 },
    CodeCoverageSummary: { key: BuildResultsSummaryTabSectionIds.CodeCoverageSummary, template: "buildvnext_details_summary_tab_codecoverage", order: 200, column: 1 },
    BuildTags: { key: BuildResultsSummaryTabSectionIds.BuildTags, template: "buildvnext_details_summary_tab_tags", order: 300, column: 1 },
    DeploymentInformation: { key: BuildResultsSummaryTabSectionIds.DeploymentInformation, template: "buildvnext_details_summary_tab_deployments", order: 400, column: 1 },
}

export class SummarySection {
    public key: string;
    public displayName: string;
    public messages: KnockoutObservableArray<string> = ko.observableArray([]);
    public order: number;
    public column: KnockoutObservable<number> = ko.observable(0);
    public template: string;
    public isVisible: KnockoutComputed<boolean>;

    public contributions: KnockoutObservableArray<Contribution> = ko.observableArray([]);
    public contributingToExistingSection: KnockoutObservable<boolean> = ko.observable(false);

    private _isVisible: KnockoutObservable<boolean> = ko.observable(true);

    constructor(key: string, template: string, displayName: string, order: number, column: number, isVisibleComputed?: KnockoutComputed<boolean>) {
        this.displayName = displayName;
        this.order = order;
        this.column(column);
        this.template = template;
        this.key = key;
        if (isVisibleComputed) {
            // we link to that observable directly
            this.isVisible = ko.computed({
                read: () => {
                    return isVisibleComputed();
                },
                write: (newValue: boolean) => {
                    return newValue;
                }
            });
        }
        else {
            this.isVisible = ko.computed({
                read: () => {
                    return this._isVisible();
                },
                write: (newValue: boolean) => {
                    this._isVisible(newValue);
                    return newValue;
                }
            });
        }
    }

    public addMessage(message: string) {
        this.messages.push(message);
    }

    public addMessages(messages: string[]) {
        var allMessages = this.messages.peek().concat(messages);
        this.messages(allMessages);
    }
}

export class SectionFactory {
    private _sectionsMap: IDictionaryStringTo<SummarySection> = {};
    private _sectionOrder: number = $.map(WellKnownSections, function (n, i) { return i; }).length * 100;
    private _customSectionTemplate = "buildvnext_details_section_header";

    constructor() {
    }

    public clearSectionsMap() {
        this._sectionsMap = <any>{};
        this._sectionOrder = $.map(WellKnownSections, function (n, i) { return i; }).length * 100;
    }

    public insertSections(sectionsMap: KnockoutObservableArray<SummarySection>, sections: SummarySection[], replaceAll: boolean = false) {
        sections = sections || [];
        sections = this._sortSections(sections);
        if (replaceAll) {
            sectionsMap(sections);
        }
        else {
            // there might be a section already existing, let's find out and replace that single object and push the rest
            let existingSectionsMap: IDictionaryStringTo<SummarySection> = {};
            let allSections = sectionsMap.peek();
            allSections.forEach((section) => {
                existingSectionsMap[section.key] = section;
            });
            let newSections: SummarySection[] = [];
            sections.forEach((section) => {
                if (existingSectionsMap[section.key]) {
                    sectionsMap.replace(existingSectionsMap[section.key], section);
                }
                else {
                    newSections.push(section);
                }
            });
            if (newSections.length > 0) {
                ko.utils.arrayPushAll(allSections, newSections);
                // as new sections exist, let's sort them out before calling for value mutation
                allSections = this._sortSections(allSections);
                sectionsMap(allSections);
                sectionsMap.valueHasMutated();
            }
        }
    }

    public createContributedSections(sectionContributions: Contribution[]): SummarySection[] {
        let createdSections: SummarySection[] = [];
        sectionContributions.forEach((sectionContribution) => {
            let honorOrder = false;
            if (ExtensionHelper.isContributionTrusted(sectionContribution)) {
                // internal extension, honor the order
                honorOrder = true;
            }
            let sectionName = sectionContribution.properties["name"] || BuildResources.BuildCustomSection;
            let order = null;
            let column = null;
            if (honorOrder) {
                order = sectionContribution.properties["order"];
            }
            // default custom sections to column 1
            column = sectionContribution.properties["column"] || 0;
            let targetId = sectionContribution.properties["targetId"] || sectionContribution.id;

            createdSections.push(this.createCustomSection(targetId, sectionName, order, column, sectionContribution));

            ExtensionHelper.publishTraceData(sectionContribution);
        });

        return createdSections;
    }

    public createWellKnownSection(key: string, isVisibleComputed?: KnockoutComputed<boolean>, contribution?: Contribution): SummarySection {
        var existingSection: SummarySection = this._sectionsMap[key];

        if (existingSection) {
            if (contribution) {
                // Section will have contribution now => contributing to existing section
                existingSection.contributingToExistingSection(true); // This determines whether to apply root template or not, hence must be set before pushing the contribution
                existingSection.contributions.push(contribution);
            }
            return existingSection;
        }
        var section: SummarySection = null;
        switch (key) {
            case WellKnownSections.BuildDetails.key:
                section = new SummarySection(key, WellKnownSections.BuildDetails.template, BuildResources.BuildSummaryDetailsHeader, WellKnownSections.BuildDetails.order, WellKnownSections.BuildDetails.column, isVisibleComputed);
                break;
            case WellKnownSections.BuildTags.key:
                section = new SummarySection(key, WellKnownSections.BuildTags.template, BuildResources.TagsLabel, WellKnownSections.BuildTags.order, WellKnownSections.BuildTags.column, isVisibleComputed);
                break;
            case WellKnownSections.BuildIssues.key:
                section = new SummarySection(key, WellKnownSections.BuildIssues.template, BuildResources.IssuesLabel, WellKnownSections.BuildIssues.order, WellKnownSections.BuildIssues.column, isVisibleComputed);
                break;
            case WellKnownSections.AssociatedChangeset.key:
                section = new SummarySection(key, WellKnownSections.AssociatedChangeset.template, BuildResources.BuildDetailsSummaryAssociatedChanges, WellKnownSections.AssociatedChangeset.order, WellKnownSections.AssociatedChangeset.column, isVisibleComputed);
                break;
            case WellKnownSections.DeploymentInformation.key:
                section = new SummarySection(key, WellKnownSections.DeploymentInformation.template, BuildResources.DeploymentLabel, WellKnownSections.DeploymentInformation.order, WellKnownSections.DeploymentInformation.column, isVisibleComputed);
                break;
            case WellKnownSections.TestSummary.key:
                break;
            case WellKnownSections.DiagnosticLogs.key:
                if (FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.WebAccessBuildDiagnosticLogs, false)) {
                    section = new SummarySection(key, WellKnownSections.DiagnosticLogs.template, BuildResources.DiagnosticLogsLabel, WellKnownSections.DiagnosticLogs.order, WellKnownSections.DiagnosticLogs.column, isVisibleComputed);
                }
                break;
            case WellKnownSections.CodeCoverageSummary.key:
                // if feature flag is not enabled, create a section, else there will be a contributed section which will be created as custom section
                if (!FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.BuildSummaryCodeCoverageCharts, false)) {
                    section = new SummarySection(key, WellKnownSections.CodeCoverageSummary.template, BuildResources.BuildDetailsSummaryCodeCoverage, WellKnownSections.CodeCoverageSummary.order, WellKnownSections.CodeCoverageSummary.column, isVisibleComputed);
                }
                break;
            case WellKnownSections.AssociatedWorkItem.key:
                section = new SummarySection(key, WellKnownSections.AssociatedWorkItem.template, BuildResources.BuildDetailsSummaryWorkItems, WellKnownSections.AssociatedWorkItem.order, WellKnownSections.AssociatedWorkItem.column, isVisibleComputed);
                break;
        }

        if (section) {
            if (contribution) {
                section.contributions.push(contribution);
            }
            this._sectionsMap[key] = section;
        }
        return section;
    }

    public createCustomSection(key: string, customSummaryDisplayName?: string, customSummaryOrder?: number, customSummaryColumn?: number, contribution?: Contribution): SummarySection {
        let existingSection: SummarySection = this._sectionsMap[key];
        if (existingSection) {
            if (contribution) {
                // Section will have contribution now => contributing to existing section
                existingSection.contributingToExistingSection(true); // This determines whether to apply root template or not, hence must be set before pushing the contribution
                existingSection.contributions.push(contribution);
            }
            return existingSection;
        }
        let section = new SummarySection(
            key,
            this._customSectionTemplate,
            customSummaryDisplayName || BuildResources.BuildCustomSection,
            $.isNumeric(customSummaryOrder) ? customSummaryOrder : this._sectionOrder += 100,
            $.isNumeric(customSummaryColumn) ? customSummaryColumn : 0
        );
        if (contribution) {
            section.contributions.push(contribution);
        }
        this._sectionsMap[key] = section;
        return section;
    }

    private _sortSections(sections: SummarySection[]) {
        let sortedSections = sections.sort((a, b) => {
            return a.order - b.order;
        });
        return sortedSections;
    }
}