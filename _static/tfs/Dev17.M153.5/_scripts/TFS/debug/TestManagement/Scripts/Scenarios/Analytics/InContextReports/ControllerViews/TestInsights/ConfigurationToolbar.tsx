import "VSS/LoaderPlugins/Css!TestManagement/Scripts/Scenarios/Analytics/InContextReports/ControllerViews/TestInsights/ConfigurationToolbar";

import { CommandBarButton } from "OfficeFabric/Button";
import { CommandBar } from "OfficeFabric/CommandBar";
import { IContextualMenuItem } from "OfficeFabric/components/ContextualMenu/ContextualMenu.types";
import { IIconProps } from "OfficeFabric/Icon";
import { Label } from "OfficeFabric/Label";
import * as React from "react";
import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import { FilterActionsCreator } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Actions/FilterActionsCreator";
import * as Definitions from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Definitions";
import * as CommonTypes from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Types";
import { Utility } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Utility";
import { FilterStore } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Stores/FilterStore";
import { ConfigurationToolbarStore, IConfigurationToolbarState } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Stores/TestInsights/ConfigurationToolbarStore";
import { LabelledContextualMenu } from "TestManagement/Scripts/Scenarios/Common/Components/LabelledContextualMenu";
import { FilterActionHub } from "TestManagement/Scripts/Scenarios/Common/TestResultsFilter/Actions/FilterActionHub";
import { ITestResultsFilterField, TestResultsFilter, TestResultsFilterFieldType } from "TestManagement/Scripts/Scenarios/Common/TestResultsFilter/Components/TestResultsFilter";
import { FilterState, sortFilterState } from "TestManagement/Scripts/Scenarios/Common/TestResultsFilter/TestResults.Filtering.Common";
import * as TCMLicenseAndFeatureFlagUtils from "TestManagement/Scripts/Utils/TFS.TestManagement.LicenseAndFeatureFlagUtils";
import * as TCMContracts from "TFS/TestManagement/Contracts";
import * as ComponentBase from "VSS/Flux/Component";
import * as Utils_String from "VSS/Utils/String";
import { TooltipHost } from "VSSUI/Tooltip";


export interface IConfigurationToolbarProps extends CommonTypes.IReportComponentProps {
    testContext: CommonTypes.ITestContext;
    onBackNavigation?: () => void;
    onConfigurationChange?: (newConfValues: CommonTypes.IReportConfiguration) => void;
    onToggleFilter?: () => void;
    testResultsContext: TCMContracts.TestResultsContext;
}

export class ConfigurationToolbar extends ComponentBase.Component<IConfigurationToolbarProps, IConfigurationToolbarState> {

    public componentWillMount(): void {
        this._reportConfigurationDefinition = new Definitions.TestInsightsConfigurationDefinition();

        this._createFilterStoreAndActionCreator();

        this._store = ConfigurationToolbarStore.getInstance(this._reportConfigurationDefinition.defaultConfigurationValues(this.props.testResultsContext.contextType), this.props.instanceId);
        this._store.addChangedListener(this._onStoreUpdate);

        this.setState(this._store.getState());
    }

    public componentWillUnmount(): void {
        this._store.removeChangedListener(this._onStoreUpdate);
    }

    public render(): JSX.Element {
        let commandBarFarItems: IContextualMenuItem[] = [
            {
                className: "testinsights-configuration-selector",
                key: "period_selector",
                name: "period_selector",
                onRender: this._periodSelectorRenderer
            }];

        const configuredFilters: FilterState = this._store.getState().reportConfigurationValues.configuredFilters;
        if (this._isFiltersFeatureFlagEnabled()) {
            commandBarFarItems.push(this._getFiltersToggleButton(configuredFilters));
        }

        return (
            <div className="testinsights-analytics-report-view-configurationtoolbar">
                <CommandBar
                    className="testinsights-configuration-commandbar"
                    items={
                        [
                            {
                                className: "testinsights-configuration-item",
                                key: "test-name",
                                onRender: this._testMethodNameLabelRenderer
                            },
                            {
                                className: "testinsights-configuration-separator",
                                key: "test-separator",
                                name: "|"
                            },
                            {
                                className: "testinsights-configuration-button",
                                key: "test-back",
                                onRender: this._backButtonRenderer
                            }
                        ]
                    }
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

    private _testMethodNameLabelRenderer = (item: IContextualMenuItem) => {
        return (
            <TooltipHost hostClassName="testinsights-configuration-tooltiphost" content={this.props.testContext.testName}>
                <Label className="testinsights-configuration-label">
                    {this.props.testContext.testName}
                </Label>
            </TooltipHost>
        );
    }

    private _backButtonRenderer = (item: IContextualMenuItem) => {
        return (
            <CommandBarButton className="testinsights-configuration-backButton"
                text={Resources.BackText}
                iconProps={{ iconName: "RevToggleKey" } as IIconProps}
                onClick={this.props.onBackNavigation}
                ariaLabel={Resources.BackText}
            />
        );
    }

    private _periodSelectorRenderer = (item: IContextualMenuItem) => {
        let configurationValues = this.state.reportConfigurationValues;
        let periodOptions = this._reportConfigurationDefinition.getPeriodConfigurationProps().options;
        return (
            <TooltipHost content={Resources.PeriodLabel}>
                <LabelledContextualMenu
                    optionsCssClassName="testinsights-configuration-selector-options"
                    iconProps={{ iconName: "Calendar" } as IIconProps}
                    options={this._convertToContextualMenuItemArray(periodOptions)}
                    selectedOptionsText={periodOptions[configurationValues.period] || Utils_String.empty}
                    onChange={this._onPeriodChanged}
                    contextualMenuAriaLabel={Utils_String.format(Resources.PeriodSelectedAriaLabel, periodOptions[configurationValues.period] || Utils_String.empty)}
                />
            </TooltipHost>
            );
    }

    private _onPeriodChanged = (ev: React.MouseEvent<HTMLElement>, item: IContextualMenuItem) => {
        let newConfValues = Object.assign({}, this.state.reportConfigurationValues);
        newConfValues.period = Number(item.key);

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

    private _getFiltersToggleButton(configuredFilter: FilterState): IContextualMenuItem {
        return {
            className: this.state.isFilterBarVisible ? "filter-toggle-button-on" : "filter-toggle-button",
            key: "filter-button",
            iconProps: { iconName: configuredFilter && Object.keys(configuredFilter).length > 0 ? "FilterSolid" : "Filter" },
            onClick: this.props.onToggleFilter,
            ariaLabel: this.state.isFilterBarVisible ? Resources.HideFilterBarTitle : Resources.ShowFilterBarTitle
        };
    }

    private _isFiltersFeatureFlagEnabled(): boolean {
        return TCMLicenseAndFeatureFlagUtils.LicenseAndFeatureFlagUtils.isAnalyticsTestResultsFiltersEnabled();
    }

    private _getFilterFieldValues(): ITestResultsFilterField[] {
        let filterFieldValues: ITestResultsFilterField[] = [];
        const configuredFilters: FilterState = this._store.getState().reportConfigurationValues.configuredFilters;

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
                fieldName: CommonTypes.Filter.Outcome,
                placeholder: Resources.FilterByOutcome
            }
        );

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

    private _convertToContextualMenuItemArray(options: IDictionaryNumberTo<string>): IContextualMenuItem[] {
        return Object.keys(options).map(k => ({ key: k, name: options[k] } as IContextualMenuItem));
    }

    private _onStoreUpdate = () => {
        this.setState(this._store.getState());
    }

    private _store: ConfigurationToolbarStore;
    private _reportConfigurationDefinition: Definitions.TestInsightsConfigurationDefinition;
    private _filterStore: FilterStore;
    private _filterActionsCreator: FilterActionsCreator;
    private _filterActionHub: FilterActionHub;
}