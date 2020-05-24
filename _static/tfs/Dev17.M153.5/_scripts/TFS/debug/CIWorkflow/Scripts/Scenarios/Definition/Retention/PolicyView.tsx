/// <reference types="react" />

import * as React from "react";

import * as Resources from "CIWorkflow/Scripts/Resources/TFS.Resources.CIWorkflow";
import { FilterOption, FilterType } from "CIWorkflow/Scripts/Scenarios/Definition/Common";
import { FiltersComponent as Filters } from "CIWorkflow/Scripts/Scenarios/Definition/Components/Filters";
import { IInputType, RetentionPolicyActionsCreator } from "CIWorkflow/Scripts/Scenarios/Definition/Retention/PolicyActionsCreator";
import { RetentionPolicyHeader } from "CIWorkflow/Scripts/Scenarios/Definition/Retention/PolicyHeader";
import { IRetentionPolicyInputState, RetentionPolicyStore } from "CIWorkflow/Scripts/Scenarios/Definition/Retention/PolicyStore";
import { SourceProvider } from "CIWorkflow/Scripts/Scenarios/Definition/SourceProvider";
import { SourceProvidersStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/SourceProvidersStore";
import { SourcesSelectionStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/SourcesSelectionStore";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { ICalloutContentProps } from "DistributedTaskControls/Components/CalloutComponent";
import { ErrorComponent } from "DistributedTaskControls/SharedControls/ErrorComponent/ErrorComponent";
import { IInfoProps } from "DistributedTaskControls/SharedControls/InputControls/Common";
import { BooleanInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/BooleanInputComponent";
import { StringInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/StringInputComponent";

import { IDropdownOption } from "OfficeFabric/components/Dropdown/Dropdown.types";
import { Label } from "OfficeFabric/Label";

import * as Utils_String from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!CIWorkflow/Scripts/Scenarios/Definition/Retention/PolicyView";

export interface IRetentionPolicyViewProps extends Base.IProps {
    policyInstanceId: string;
    heading: string;
    hideBranchFilters?: boolean;
    disabled?: boolean;
    onRemove?: (id: string) => void;
}

export class RetentionPolicyView extends Base.Component<IRetentionPolicyViewProps, IRetentionPolicyInputState> {
    private _actionCreator: RetentionPolicyActionsCreator;
    private _store: RetentionPolicyStore;
    private _sourceProvidersStore: SourceProvidersStore;
    private _sourcesSelectionStore: SourcesSelectionStore;

    public componentWillMount() {
        this._sourceProvidersStore = StoreManager.GetStore<SourceProvidersStore>(SourceProvidersStore);
        this._sourcesSelectionStore = StoreManager.GetStore<SourcesSelectionStore>(SourcesSelectionStore);

        this._actionCreator = ActionCreatorManager.GetActionCreator<RetentionPolicyActionsCreator>(RetentionPolicyActionsCreator, this.props.policyInstanceId);
        this._store = StoreManager.GetStore<RetentionPolicyStore>(RetentionPolicyStore, this.props.policyInstanceId);
        this._store.addChangedListener(this._onChange);

        this.setState(this._store.getInputState());
    }

    public componentWillUnmount(): void {
        this._store.removeChangedListener(this._onChange);
    }

    public render(): JSX.Element {
        const repositoryType: string = this.state.selectedRepositoryType;
        const provider: SourceProvider = this._sourceProvidersStore.getProvider(repositoryType);
        const isBranchFilterSupported: boolean = provider && provider.isBranchFilterSupported();

        let minimumToKeepInfoContent = {
            calloutMarkdown: Resources.RetentionMinimumToKeepWithBranchesInfo
        } as ICalloutContentProps;

        let testResultsInfoContent = {
            calloutMarkdown: Resources.RetentionDeleteTestResultsInfo
        } as ICalloutContentProps;

        let testResultsInfoProps: IInfoProps = {
            calloutContentProps: testResultsInfoContent
        };

        let minimumToKeepInfoProps: IInfoProps = {
            calloutContentProps: minimumToKeepInfoContent
        };

        return (
            <div className="ci-retention-policy-view constrained-width">

                <RetentionPolicyHeader {...this.props} />

                <div className="ci-retention-policy-body">

                    {/* Branch filter component. This will not be visible for maximum policy item. */}
                    {!this.props.hideBranchFilters &&
                        isBranchFilterSupported && (
                            <div className="ci-retention-policy-branch-filter">
                                <Filters
                                    filterType={FilterType.BranchFilter}
                                    filters={this.state.branchFilters}
                                    isFilterRequired={true}
                                    repository={this._sourcesSelectionStore.getBuildRepository()}
                                    repositoryType={repositoryType}
                                    onFilterOptionChange={this._onBranchFilterOptionChange}
                                    onFilterChange={this._onBranchFilterValueChange}
                                    onFilterDelete={this._onBranchFilterDelete}
                                    onAddFilterClick={this._onAddNewBranchFilter}
                                    gitBranches={this._sourcesSelectionStore.getBranches()}
                                    isReadOnly={!!this.props.disabled} />
                            </div>
                        )}

                    {!this.props.disabled &&
                        this._store.showBranchFiltersError() &&
                        <ErrorComponent
                            cssClass="filters-error"
                            errorMessage={Resources.AddBranchFilterError} />
                    }

                    <div className="clear-floating-style" />

                    {/* Days to keep and minimum to keep. */}
                    <table className="ci-retention-policy-inputs">
                        <tbody>
                            <tr>
                                <td className="ci-retention-policy-text-input">
                                    <StringInputComponent
                                        label={Resources.RetentionDaysToKeepLabel}
                                        disabled={this.props.disabled}
                                        onValueChanged={this._onDaysToKeepChange}
                                        value={this.state.daysToKeep}
                                        getErrorMessage={(value: string) => { return this._getErrorMessage(value, IInputType.DaysToKeep); }}
                                        aria-disabled={this.props.disabled} />
                                </td>
                                <td className="ci-retention-policy-text-input">
                                    <StringInputComponent
                                        label={Resources.RetentionMinimumToKeep}
                                        infoProps={minimumToKeepInfoProps}
                                        disabled={this.props.disabled}
                                        onValueChanged={this._onMinimumToKeepChange}
                                        value={this.state.minimumToKeep}
                                        getErrorMessage={(value: string) => { return this._getErrorMessage(value, IInputType.MinimumToKeep); }} />
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    {/* Various clean up options. */}
                    <Label>
                        {Resources.RetentionCleanupOptionsText}
                    </Label>
                    <BooleanInputComponent
                        label={Resources.RetentionCleanupOption_BuildRecord}
                        cssClass="ci-retention-policy-checkbox-buildrecord"
                        disabled={this.props.disabled}
                        value={this.state.deleteBuildRecord}
                        onValueChanged={this._onBuildRecordChange} />

                    <BooleanInputComponent
                        label={Resources.RetentionCleanupOption_SourceLabel}
                        cssClass="ci-retention-policy-checkbox-sourcelabel"
                        disabled={this.props.disabled}
                        value={this.state.deleteSourceLabel}
                        onValueChanged={this._onSourceLabelChange} />

                    <BooleanInputComponent
                        label={Resources.RetentionCleanupOption_FileShare}
                        cssClass="ci-retention-policy-checkbox-fileshare"
                        disabled={this.props.disabled}
                        value={this.state.deleteFileShare}
                        onValueChanged={this._onFileShareChange} />

                    <BooleanInputComponent
                        label={Resources.RetentionCleanupOption_Symbols}
                        cssClass="ci-retention-policy-checkbox-symbols"
                        disabled={this.props.disabled}
                        value={this.state.deleteSymbols}
                        onValueChanged={this._onSymbolsChange} />

                    <BooleanInputComponent
                        label={Resources.RetentionCleanupOption_TestResults}
                        cssClass="test-result-check-box"
                        disabled={this.props.disabled}
                        value={this.state.deleteTestResults}
                        onValueChanged={this._onTestResultsChange}
                        infoProps={testResultsInfoProps} />
                </div>
            </div>
        );
    }

    private _getErrorMessage(value: string, inputType: IInputType): string {
        let errorMessage: string = Utils_String.empty;
        if (!this._store.isValidInput(value, inputType)) {
            let maxValue: number = this._store.getMaximumValue(inputType);

            switch (inputType) {
                case IInputType.DaysToKeep:
                    errorMessage = Utils_String.format(Resources.NumberFieldErrorMessage, 1, maxValue);
                    break;
                case IInputType.MinimumToKeep:
                    errorMessage = Utils_String.format(Resources.NumberFieldErrorMessage, 0, maxValue);
                    break;
            }
        }

        return errorMessage;
    }

    private _onNotifyValidation(value: string, inputType: IInputType) {
        switch (inputType) {
            case IInputType.DaysToKeep:
                this._onDaysToKeepChange(value);
                break;
            case IInputType.MinimumToKeep:
                this._onMinimumToKeepChange(value);
                break;
        }
    }

    private _onChange = () => {
        this.setState(this._store.getInputState());
    }

    private _onDaysToKeepChange = (newValue: string) => {
        this._actionCreator.updateInput(IInputType.DaysToKeep, newValue);
    }

    private _onMinimumToKeepChange = (newValue: string) => {
        this._actionCreator.updateInput(IInputType.MinimumToKeep, newValue);
    }

    private _onBuildRecordChange = (newValue: boolean) => {
        this._actionCreator.updateInput(IInputType.BuildRecord, newValue.toString());
    }

    private _onSourceLabelChange = (newValue: boolean) => {
        this._actionCreator.updateInput(IInputType.SourceLabel, newValue.toString());
    }

    private _onFileShareChange = (newValue: boolean) => {
        this._actionCreator.updateInput(IInputType.FileShare, newValue.toString());
    }

    private _onSymbolsChange = (newValue: boolean) => {
        this._actionCreator.updateInput(IInputType.Symbols, newValue.toString());
    }

    private _onTestResultsChange = (newValue: boolean) => {
        this._actionCreator.updateInput(IInputType.TestResults, newValue.toString());
    }

    private _onBranchFilterOptionChange = (option: IDropdownOption, optionIndex: number, rowIndex: number) => {
        let branchFilter = this.state.branchFilters[rowIndex].substr(1);

        if (option.key === FilterOption.Include) {
            branchFilter = "+" + branchFilter;
        }
        else if (option.key === FilterOption.Exclude) {
            branchFilter = "-" + branchFilter;
        }

        this._actionCreator.updateBranchFilter(branchFilter, rowIndex);
    }

    private _onBranchFilterValueChange = (newValue: string, rowIndex: number) => {
        let filterOption = this.state.branchFilters[rowIndex].charAt(0);

        this._actionCreator.updateBranchFilter(filterOption + newValue.trim(), rowIndex);
    }

    private _onBranchFilterDelete = (rowIndex: number) => {
        this._actionCreator.deleteBranchFilter(rowIndex);
    }

    private _onAddNewBranchFilter = () => {
        // Default branch filter added is included with default branch.
        this._actionCreator.addBranchFilter("+" + this._sourcesSelectionStore.getBuildRepository().defaultBranch);
    }
}
