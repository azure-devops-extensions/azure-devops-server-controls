/// <reference types="react" />

import * as React from "react";

import * as Resources from "CIWorkflow/Scripts/Resources/TFS.Resources.CIWorkflow";
import * as Actions from "CIWorkflow/Scripts/Scenarios/Definition/Actions/TriggersActions";
import { TriggersActionsCreator } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/TriggersActionsCreator";
import { FilterType } from "CIWorkflow/Scripts/Scenarios/Definition/Common";
import { FiltersComponent as Filters } from "CIWorkflow/Scripts/Scenarios/Definition/Components/Filters";
import { SourceProvider, SourceProviderUtils } from "CIWorkflow/Scripts/Scenarios/Definition/SourceProvider";
import { GatedCheckInStore, ITriggersState } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/GatedCheckInStore";
import { SourcesSelectionStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/SourcesSelectionStore";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import { Item } from "DistributedTaskControls/Common/Item";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";
import { TwoPanelOverviewComponent } from "DistributedTaskControls/Components/TwoPanelOverviewComponent";
import { ErrorComponent } from "DistributedTaskControls/SharedControls/ErrorComponent/ErrorComponent";
import { BooleanInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/BooleanInputComponent";
import { ToggleInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/ToggleInputComponent";

import { ISelectedPathNode } from "DistributedTasksCommon/TFS.Tasks.Types";

import { IDropdownOption } from "OfficeFabric/components/Dropdown/Dropdown.types";
import { css } from "OfficeFabric/Utilities";

import { BuildRepository } from "TFS/Build/Contracts";

import * as Utils_String from "VSS/Utils/String";

export interface IGatedCheckInTriggerOverviewProps extends Base.IProps {
    item: Item;
}

export class GatedCheckInTriggerOverview extends Base.Component<IGatedCheckInTriggerOverviewProps, ITriggersState> {
    private _triggersStore: GatedCheckInStore;
    private _sourcesSelectionStore: SourcesSelectionStore;

    public constructor(props: IGatedCheckInTriggerOverviewProps) {
        super(props);

        this._sourcesSelectionStore = StoreManager.GetStore<SourcesSelectionStore>(SourcesSelectionStore);

        this._triggersStore = StoreManager.GetStore<GatedCheckInStore>(GatedCheckInStore);
        this.state = this._triggersStore.getState();
    }

    public render(): JSX.Element {
        const repository: BuildRepository = this._sourcesSelectionStore.getBuildRepository();
        const repositoryName: string = repository ? repository.name : Utils_String.empty;
        const repositoryType: string = repository ? repository.type : Utils_String.empty;
        
        return (
            <div className="repository-trigger-item-overview">
                <TwoPanelOverviewComponent
                    title={repositoryName}
                    view={this._getView()}
                    item={this.props.item}
                    instanceId="trigger-selector"
                    iconClassName={css("bowtie-icon", SourceProviderUtils.getIconClass(repositoryType), "trigger-icon")}
                    overviewClassName="ci-trigger-overview-body" />
            </div>
        );
    }

    public componentDidMount(): void {
        this._triggersStore.addChangedListener(this._onChange);
    }

    public componentWillUnmount(): void {
        this._triggersStore.removeChangedListener(this._onChange);
    }

    private _onChange = (): void => {
        this.setState(this._triggersStore.getState());
    }

    private _getView(): JSX.Element {
        if (this.state.isGatedCheckInEnabled) {
            if (this._triggersStore.isValid()) {
                return (
                    <div className="repository-triggers-view">
                        {Resources.RepositoryEnabledMessage}
                    </div>
                );
            }
            else {
                return <ErrorComponent cssClass="trigger-overview-error" errorMessage={Resources.SomeSettingsNeedAttention} />;
            }
        }
        else {
            return (
                <div className="repository-triggers-view">
                    {Resources.RepositoryDisabledMessage}
                </div>
            );
        }
    }
}

export interface IGatedCheckInDetailsProps extends Base.IProps {
    disabled?: boolean;
}

export class GatedCheckInDetails extends Base.Component<IGatedCheckInDetailsProps, ITriggersState> {
    private _gatedFocusContainer: HTMLDivElement;
    private _focusOnFirstComponent: boolean = false;
    private _focusCheckbox: BooleanInputComponent;
    private _store: GatedCheckInStore;
    private _triggersActionCreator: TriggersActionsCreator;
    private _sourcesSelectionStore: SourcesSelectionStore;
    
    public constructor(props: IGatedCheckInDetailsProps) {
        super(props);

        this._store = StoreManager.GetStore<GatedCheckInStore>(GatedCheckInStore);
        this._triggersActionCreator = ActionCreatorManager.GetActionCreator<TriggersActionsCreator>(TriggersActionsCreator);

        this._sourcesSelectionStore = StoreManager.GetStore<SourcesSelectionStore>(SourcesSelectionStore);

        this.state = this._store.getState();
    }

    public render(): JSX.Element {
        const repository: BuildRepository = this._sourcesSelectionStore.getBuildRepository();
        const repositoryName: string = repository ? repository.name : Utils_String.empty;
        const repositoryType: string = repository ? repository.type : Utils_String.empty;
        const defaultPath: string = repository ? repository.rootFolder : Utils_String.empty;
        const showPathFiltersError: boolean = this._store.showPathFiltersError();

        return (
            this.state.showGatedCheckIn ?
                <div className="gated-check-in-details">
                    <div className="trigger-details-header">
                        <div className={css(
                            "trigger-header-icon bowtie-icon",
                            SourceProviderUtils.getIconClass(repositoryType))}>
                        </div>
                        <div className="trigger-title">
                            {repositoryName}
                        </div>
                    </div>

                    <BooleanInputComponent
                        cssClass="checkbox-data"
                        label={Resources.EnableGatedCheckIn}
                        value={this.state.isGatedCheckInEnabled}
                        onValueChanged={this._onGatedCheckInToggle}
                        disabled={!!this.props.disabled} />

                    {
                        (this.state.isGatedCheckInEnabled) ?
                            <div className="gated-checkin-settings" ref={(element) => { this._gatedFocusContainer = element; }}>
                                <BooleanInputComponent
                                    cssClass="checkbox-data"
                                    ref={(checkbox) => { this._focusCheckbox = checkbox; }}
                                    label={Resources.RunContinuousIntegration}
                                    onValueChanged={this._onRunContinuousIntegrationChanged}
                                    value={this.state.runContinuousIntegration}
                                    disabled={!!this.props.disabled} />

                                <BooleanInputComponent
                                    cssClass="checkbox-data"
                                    label={Resources.UseWorkspaceMapping}
                                    onValueChanged={this._onUseWorkspaceMappingChanged}
                                    value={this.state.useWorkspaceMappings}
                                    disabled={!!this.props.disabled} />

                                {!this.state.useWorkspaceMappings &&
                                    <Filters
                                        key="gated-checkin-filters"
                                        repository={repository}
                                        repositoryType={repositoryType}
                                        isFilterRequired={true}
                                        onFilterOptionChange={this._onPathFilterOptionChange}
                                        filterType={FilterType.PathFilter}
                                        filters={this.state.pathFilters}
                                        onFilterChange={this._onPathFilterChange}
                                        onAddFilterClick={this._onAddPathFilterClick}
                                        onFilterDelete={this._onPathFilterDelete}
                                        showPathDialog={this._showPathDialog}
                                        isReadOnly={!!this.props.disabled} />
                                }
                                {
                                    showPathFiltersError &&
                                    <ErrorComponent
                                        errorMessage={Resources.AddPathFilterError} />
                                }

                            </div>

                            : null
                    }
                </div>
                : null
        );
    }

    public componentDidMount(): void {
        this._store.addChangedListener(this._onChange);
    }

    public componentDidUpdate(): void{
        if (this._focusOnFirstComponent && this._focusCheckbox) {
            this._focusCheckbox.setFocus();
            this._focusOnFirstComponent = false;
        }
    }

    public componentWillUnmount(): void {
        this._store.removeChangedListener(this._onChange);
    }

    private _onChange = (): void => {
        this.setState(this._store.getState());
    }

    private _showPathDialog = (initialValue: string, callback: (selectedValue: ISelectedPathNode) => void): void => {
        this._sourcesSelectionStore.showPathDialog(initialValue, callback);
    }

    private _onGatedCheckInToggle = (isEnabled: boolean): void => {
        let defaultPath: string = this._sourcesSelectionStore.getBuildRepository() ? this._sourcesSelectionStore.getBuildRepository().rootFolder : Utils_String.empty;
        let togglePayload: Actions.IToggleGatedCheckInPayload = {
            toggleValue: isEnabled,
            defaultPath: defaultPath
        };
        this._triggersActionCreator.toggleGatedCheckIn(togglePayload);

        //Setting the focus boolean for first component inside the Gated checkin toggle
        this._focusOnFirstComponent = isEnabled;
    }

    private _onRunContinuousIntegrationChanged = (isChecked: boolean): void => {
        //Setting the focus on first component as false as focus is not needed on first component
        this._focusOnFirstComponent = false;

        let payload: Actions.IUpdateGatedCheckInPayload = {
            runContinuousIntegration: !!isChecked
        };
        this._triggersActionCreator.runContinuousIntegration(payload);
    }

    private _onUseWorkspaceMappingChanged = (isChecked: boolean): void => {
        //Setting the focus on first component as false as focus is not needed on first component
        this._focusOnFirstComponent = false;

        let payload: Actions.IUpdateGatedCheckInPayload = {
            useWorkSpaceMapping: !!isChecked
        };
        this._triggersActionCreator.useWorkSpaceMapping(payload);
        if (!isChecked) {
            DtcUtils.scrollElementToView(this._gatedFocusContainer);
        }
    }

    private _onPathFilterOptionChange = (option: IDropdownOption, index: number, rowIndex: number): void => {
        //Setting the focus on first component as false as focus is not needed on first component
        this._focusOnFirstComponent = false;

        let dropdownIndexRowPair: Actions.IDropdownIndexRowPair = {
            dropdownIndex: index,
            rowIndex: rowIndex
        };
        this._triggersActionCreator.changeGatedPathFilterOption(dropdownIndexRowPair);
    }

    private _onPathFilterChange = (modifiedPathFilter: string, rowIndex: number): void => {
        //Setting the focus on first component as false as focus is not needed on first component
        this._focusOnFirstComponent = false;

        let inputIndexPair: Actions.InputIndexPair = {
            input: modifiedPathFilter,
            index: rowIndex
        };
        this._triggersActionCreator.changeGatedPathFilter(inputIndexPair);
    }

    private _onPathFilterDelete = (rowIndex: number): void => {
        //Setting the focus on first component as false as focus is not needed on first component
        this._focusOnFirstComponent = false;

        let indexNumber: Actions.IFilterRowIndex = {
            index: rowIndex
        };
        this._triggersActionCreator.removeGatedPathFilter(indexNumber);
    }

    private _onAddPathFilterClick = (event: React.MouseEvent<HTMLButtonElement>): void => {
        //Setting the focus on first component as false as focus is not needed on first component
        this._focusOnFirstComponent = false;
        const provider: SourceProvider = this._sourcesSelectionStore.getSelectedSourceProvider();
        const repositoryType: string = provider ? provider.getRepositoryType() : null;
        const defaultPathFilter: string = SourceProviderUtils.getDefaultPathFilter(repositoryType, this._sourcesSelectionStore.getBuildRepository());
        this._triggersActionCreator.addGatedPathFilter(defaultPathFilter);
        DtcUtils.scrollElementToView(event.currentTarget);
    }
}
