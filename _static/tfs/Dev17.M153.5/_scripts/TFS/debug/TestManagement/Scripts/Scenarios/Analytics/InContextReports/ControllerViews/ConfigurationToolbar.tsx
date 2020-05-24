/// <reference types="react" />
import "VSS/LoaderPlugins/Css!TestManagement/Scripts/Scenarios/Analytics/InContextReports/ControllerViews/ConfigurationToolbar";

import { CommandBar } from "OfficeFabric/CommandBar";
import { IContextualMenuItem } from "OfficeFabric/components/ContextualMenu/ContextualMenu.types";
import { IIconProps } from "OfficeFabric/Icon";
import * as React from "react";
import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import { FilterActionsCreator } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Actions/FilterActionsCreator";
import * as Definitions from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Definitions";
import * as CommonTypes from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Types";
import { Utility } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Utility";
import { ConfigurationToolbarStore, IConfigurationToolbarState } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Stores/ConfigurationToolbarStore";
import { FilterStore } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Stores/FilterStore";
import { LabelledContextualMenu } from "TestManagement/Scripts/Scenarios/Common/Components/LabelledContextualMenu";
import { FilterActionHub } from "TestManagement/Scripts/Scenarios/Common/TestResultsFilter/Actions/FilterActionHub";
import { ITestResultsFilterField, TestResultsFilter, TestResultsFilterFieldType } from "TestManagement/Scripts/Scenarios/Common/TestResultsFilter/Components/TestResultsFilter";
import { FilterState, sortFilterState } from "TestManagement/Scripts/Scenarios/Common/TestResultsFilter/TestResults.Filtering.Common";
import * as TCMLicenseAndFeatureFlagUtils from "TestManagement/Scripts/Utils/TFS.TestManagement.LicenseAndFeatureFlagUtils";
import * as TCMContracts from "TFS/TestManagement/Contracts";
import * as ComponentBase from "VSS/Flux/Component";
import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";
import { TooltipHost } from "VSSUI/Tooltip";


export interface IConfigurationToolbarProps extends CommonTypes.IReportComponentProps {
    onConfigurationChange?: (newConfValues: CommonTypes.IReportConfiguration) => void;
    onToggleFilter?: () => void;
    testResultsContext: TCMContracts.TestResultsContext;
}

export class ConfigurationToolbar extends ComponentBase.Component<IConfigurationToolbarProps, IConfigurationToolbarState> {
    constructor(props) {
        super(props);

        this._createFilterStoreAndActionCreator();

        this._reportConfigurationDefinition = new Definitions.ReportConfigurationDefinition();
        this._store = ConfigurationToolbarStore.getInstance(this._reportConfigurationDefinition.getDefaultConfigurationValues(this.props.testResultsContext.contextType), this.props.instanceId);
        this._store.addChangedListener(this._onStoreUpdate);

        this.state = this._store.getState();
    }

    public componentWillUnmount(): void {
        this._store.removeChangedListener(this._onStoreUpdate);
    }

    public render(): JSX.Element {
        let commandBarFarItems: IContextualMenuItem[] = [];
        commandBarFarItems.push(this._getPeriodSelectorMenuItem());
        commandBarFarItems.push(this._getOutcomeSelectorMenuItem());
        commandBarFarItems.push(this._getGroupBySelectorMenuItem());

        const configuredFilters: FilterState = this._store.getState().reportConfigurationValues.configuredFilters;
        if (this._isFiltersFeatureFlagEnabled()) {
            commandBarFarItems.push(this._getFiltersToggleButton(configuredFilters));
        }

        return (
            <div className="testresults-analytics-report-view-configurationtoolbar">
                <CommandBar
                    className="configuration-commandbar"
                    items={[]}
                    farItems={commandBarFarItems}
                />
                <div className="configuration-grid-separator" />
                <TestResultsFilter 
                    fields={this._getFilterFieldValues()}
                    store={this._filterStore}
                    skipRender={!this.state.isFilterBarVisible}
                    actionCreator={this._filterActionsCreator}
                    filterUpdatedCallback={this._onConfiguredFiltersChange}
                    initialFilterState={configuredFilters}
                />
            </div>
        );
    }

    private _getPeriodSelectorMenuItem(): IContextualMenuItem {
        return {
            className: "configuration-selector",
            key: "period_selector",
            name: "period_selector",
            onRender: this._periodSelectorRenderer
        };
    }

    private _getOutcomeSelectorMenuItem(): IContextualMenuItem {
        return {
            className: "configuration-selector",
            key: "outcome_selector",
            name: "outcome_selector",
            onRender: this._outcomeSelectorRenderer
        };
    }

    private _getGroupBySelectorMenuItem(): IContextualMenuItem {
        return {
            className: "configuration-selector",
            key: "groupby_selector",
            name: "groupby_selector",
            onRender: this._groupBySelectorRenderer
        };
    }

    private _getFiltersToggleButton(configuredFilter: FilterState): IContextualMenuItem {
        return {
            className: this.state.isFilterBarVisible ? "filter-toggle-button-on" : "filter-toggle-button",
            key: "filter-button",
            iconProps: { iconName: (configuredFilter && Object.keys(configuredFilter).length > 0) ? "FilterSolid" : "Filter" },
            onClick: this.props.onToggleFilter,
            ariaLabel: this.state.isFilterBarVisible ? Resources.HideFilterBarTitle : Resources.ShowFilterBarTitle
        };
    }

    private _isFiltersFeatureFlagEnabled(): boolean {
        return TCMLicenseAndFeatureFlagUtils.LicenseAndFeatureFlagUtils.isAnalyticsTestResultsFiltersEnabled();
    }

    private _getFilterFieldValues(): ITestResultsFilterField[] {
        let filterFieldValues: ITestResultsFilterField[] = [];
        const configuredFilters: FilterState = this._store.getState().reportConfigurationValues.configuredFilters || {};

        if (this.props.testResultsContext.contextType === TCMContracts.TestResultsContextType.Build) {
            filterFieldValues.push({
                displayType: TestResultsFilterFieldType.CheckboxList,
                fieldName: CommonTypes.Filter.Workflow,
                placeholder: Resources.Workflow
            });
        }

        filterFieldValues.push(
            {
                displayType: TestResultsFilterFieldType.CheckboxList,
                fieldName: CommonTypes.Filter.Branch,
                placeholder: Resources.BranchText,
                noItemsText: Resources.FilterNoBranch
            },
            {
                displayType: TestResultsFilterFieldType.CheckboxList,
                fieldName: CommonTypes.Filter.Environment,
                placeholder: Resources.Stage,
                noItemsText: Resources.FilterNoStage,
                disabled: this.props.testResultsContext.contextType === TCMContracts.TestResultsContextType.Build && Utility.doesWorkflowFilterContainOnlyBuild(configuredFilters)
            },
            {
                displayType: TestResultsFilterFieldType.CheckboxList,
                fieldName: CommonTypes.Filter.TestRun,
                placeholder: Resources.FilterByTestRun,
                noItemsText: Resources.FilterNoTestRun
            },
            {
                displayType: TestResultsFilterFieldType.CheckboxList,
                fieldName: CommonTypes.Filter.Container,
                placeholder: Resources.FilterByTestFile,
                noItemsText: Resources.FilterNoTestFile,
            },
            {
                displayType: TestResultsFilterFieldType.CheckboxList,
                fieldName: CommonTypes.Filter.Owner,
                placeholder: Resources.FilterByOwner,
                noItemsText: Resources.FilterNoOwner
            });

        return filterFieldValues;
    }

    private _createFilterStoreAndActionCreator() {
        if (!this._filterActionHub) {
            this._filterActionHub = new FilterActionHub();
            this._filterStore = FilterStore.getInstance(this.props.instanceId, this._filterActionHub);
            this._filterActionsCreator = FilterActionsCreator.getInstance(this.props.instanceId, {
                testResultContext: this.props.testResultsContext,
                actionsHub: this._filterActionHub
            });
        }
    }

    /**
     * We are having just place holder report selector. It is currently showing only one option but will have more report options.
    */
    private _reportSelectorRenderer = (item: IContextualMenuItem) => {
        return (
            <LabelledContextualMenu
                optionsCssClassName="configuration-selector-options"
                options={[{ key: "report_selector", name: Resources.TestFailuresTrendHeader }]}
                selectedOptionsText={Resources.TestFailuresTrendHeader}
                onChange={null}
            />);
    }

    private _periodSelectorRenderer = (item: IContextualMenuItem) => {
        let configurationValues = this.state.reportConfigurationValues;
        let periodOptions = this._reportConfigurationDefinition.getPeriodConfigurationProps().options;
        return (
            <TooltipHost content={Resources.PeriodLabel}>
                <LabelledContextualMenu
                    optionsCssClassName="configuration-selector-options"
                    iconProps={{ iconName: "Calendar" } as IIconProps}
                    options={this._convertToContextualMenuItemArray(periodOptions)}
                    selectedOptionsText={periodOptions[configurationValues.period] || Utils_String.empty}
                    onChange={this._onPeriodChanged}
                    contextualMenuAriaLabel={Utils_String.format(Resources.PeriodSelectedAriaLabel, periodOptions[configurationValues.period] || Utils_String.empty)}
                />
            </TooltipHost>
            );
    }

    private _outcomeSelectorRenderer = (item: IContextualMenuItem) => {
        let configurationValues = this.state.reportConfigurationValues;
        let outcomeOptions = this._reportConfigurationDefinition.getOutcomeConfigurationProps().options;
        
        let contextualMenuAriaLabel = Utils_String.empty;
        let selectedOptionText: string = Utils_String.empty;
        if (configurationValues.outcomes.length > 1) {
            selectedOptionText = Utils_String.format(Resources.MultipleOptionsSelectedText, outcomeOptions[configurationValues.outcomes[0]], configurationValues.outcomes.length - 1);
            contextualMenuAriaLabel = Utils_String.format(Resources.MultipleOutcomeSelectedAriaLabel, outcomeOptions[configurationValues.outcomes[0]], configurationValues.outcomes.length - 1);
        }
        else if (configurationValues.outcomes.length === 1) {
            selectedOptionText = outcomeOptions[configurationValues.outcomes[0]];
            contextualMenuAriaLabel = Utils_String.format(Resources.OutcomeSelectedAriaLabel, outcomeOptions[configurationValues.outcomes[0]]);
        }
        else {
            selectedOptionText = Resources.AllText;
            contextualMenuAriaLabel = Utils_String.format(Resources.OutcomeSelectedAriaLabel, Resources.AllOutcomesText);
        }

        return (
            <TooltipHost content={Resources.OutcomeFilterText}>
                <LabelledContextualMenu
                    optionsCssClassName="configuration-selector-options"
                    iconProps={{ className: "bowtie-icon icon bowtie-test-fill" } as IIconProps}
                    options={this._convertToContextualMenuItemArrayWithMultiSelect(outcomeOptions, configurationValues.outcomes as number[])}
                    selectedOptionsText={selectedOptionText}
                    onChange={this._onOutcomeChanged}
                    contextualMenuAriaLabel={contextualMenuAriaLabel}
                />
            </TooltipHost>
            );
    }

    private _groupBySelectorRenderer = (item: IContextualMenuItem) => {
        let configurationValues = this.state.reportConfigurationValues;

        let groupByOptions: IDictionaryNumberTo<string> = {};
        let allGroupByOptions = this._reportConfigurationDefinition.getGroupByConfigurationProps().options as string[];
        Object.keys(allGroupByOptions).forEach(k => {
            if (!(k === CommonTypes.GroupBy.Environment.toString() && this.props.testResultsContext.contextType !== TCMContracts.TestResultsContextType.Release)) {
                groupByOptions[Number(k)] = allGroupByOptions[k];
            }
        });
        
        return (
            <TooltipHost content={Resources.GroupByText}>
                <LabelledContextualMenu
                    optionsCssClassName="configuration-selector-options"
                    iconProps={{ className: "bowtie-icon icon bowtie-group-rows" } as IIconProps}
                    options={this._convertToContextualMenuItemArray(groupByOptions)}
                    selectedOptionsText={groupByOptions[configurationValues.groupBy] || Utils_String.empty}
                    onChange={this._onGroupByChanged}
                    contextualMenuAriaLabel={Utils_String.format(Resources.GroupBySelectedAriaLabel, groupByOptions[configurationValues.groupBy] || Utils_String.empty)}
                />
            </TooltipHost>
            );
    }

    private _onPeriodChanged = (ev: React.MouseEvent<HTMLElement>, item: IContextualMenuItem) => {
        let newConfValues = Object.assign({}, this.state.reportConfigurationValues);
        newConfValues.period = Number(item.key);

        this._onChanged(newConfValues);
    }

    private _onOutcomeChanged = (ev: React.MouseEvent<HTMLElement>, item: IContextualMenuItem) => {
        //This will let dropdown not dismiss.
        ev!.preventDefault();

        let newConfValues = Object.assign({}, this.state.reportConfigurationValues);

        let newSelectedOutcomes: CommonTypes.TestOutcome[] = Utils_Array.clone(newConfValues.outcomes);
        Utils_Array.removeWhere(newSelectedOutcomes, (o) => { return o.toString() === item.key; });

        if (newSelectedOutcomes.length === newConfValues.outcomes.length) {
            newSelectedOutcomes.push(Number(item.key));
        }

        newConfValues.outcomes = newSelectedOutcomes.sort();

        this._onChanged(newConfValues);
    }

    private _onGroupByChanged = (ev: React.MouseEvent<HTMLElement>, item: IContextualMenuItem) => {
        let newConfValues = Object.assign({}, this.state.reportConfigurationValues);
        newConfValues.groupBy = Number(item.key);

        this._onChanged(newConfValues);
    }

    private _onConfiguredFiltersChange = (configuredFilters: FilterState) => {
        sortFilterState(configuredFilters);

        const newConfValues = Object.assign({}, this.state.reportConfigurationValues);
        newConfValues.configuredFilters = Object.assign({}, configuredFilters);

        if (Utility.doesWorkflowFilterContainOnlyBuild(newConfValues.configuredFilters)) {
            //When workflow in Build then no environment filter to be shown so remove all environment filters
            delete newConfValues.configuredFilters[CommonTypes.Filter.Environment];
        }

        this._onChanged(newConfValues);
    }

    private _onChanged = (newConfValues: CommonTypes.IReportConfiguration) => {
        if (this.props.onConfigurationChange) {
            this.props.onConfigurationChange(newConfValues);
        }
    }

    private _convertToContextualMenuItemArray(options: IDictionaryNumberTo<string>): IContextualMenuItem[] {
        return Object.keys(options).map(k => ({ key: k, name: options[k] } as IContextualMenuItem));
    }

    private _convertToContextualMenuItemArrayWithMultiSelect(options: IDictionaryNumberTo<string>, selectedKeys: number[]): IContextualMenuItem[] {
        let selectedKeysMap: IDictionaryNumberTo<boolean> = {};
        selectedKeys.forEach(k => selectedKeysMap[k] = true);

        return Object.keys(options).map(k => ({ key: k, name: options[k], canCheck: true, checked: selectedKeysMap[k] } as IContextualMenuItem));
    }

    private _onStoreUpdate = () => {
        this.setState(this._store.getState());
    }

    private _store: ConfigurationToolbarStore;
    private _reportConfigurationDefinition: Definitions.ReportConfigurationDefinition;
    private _filterStore: FilterStore;
    private _filterActionsCreator: FilterActionsCreator;
    private _filterActionHub: FilterActionHub;
}