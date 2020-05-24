/// <reference types="react" />

import * as React from "react";

import * as Actions from "CIWorkflow/Scripts/Scenarios/Definition/Actions/TriggersActions";
import { TriggersActionsCreator } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/TriggersActionsCreator";
import { IBuildCompletionTriggerState, BuildCompletionTriggerStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/BuildCompletionTriggerStore";
import { FilterType } from "CIWorkflow/Scripts/Scenarios/Definition/Common";
import { FiltersComponent as Filters } from "CIWorkflow/Scripts/Scenarios/Definition/Components/Filters";
import { SourcesSelectionStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/SourcesSelectionStore";
import { CoreDefinitionStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/CoreDefinitionStore";
import * as Resources from "CIWorkflow/Scripts/Resources/TFS.Resources.CIWorkflow";

import { DtcUtils } from "DistributedTaskControls/Common/Utilities";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { BooleanInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/BooleanInputComponent";
import { ErrorComponent } from "DistributedTaskControls/SharedControls/ErrorComponent/ErrorComponent";
import { ComboBoxInputComponent, ComboBoxType } from "DistributedTaskControls/SharedControls/InputControls/Components/ComboBoxInputComponent";

import { ActionButton, IButton } from "OfficeFabric/Button";
import { IDropdownOption } from "OfficeFabric/components/Dropdown/Dropdown.types";

import { BuildRepository, BuildDefinitionReference, BuildDefinition, BuildCompletionTrigger } from "TFS/Build/Contracts";

import * as Utils_String from "VSS/Utils/String";
import { Positioning } from "VSS/Utils/UI";


export interface IBuildCompletionTriggerDetailsProps extends Base.IProps {
    index: number;
    onTriggerDeleted: (index: number) => any;
    disabled?: boolean;
}

export class BuildCompletionTriggerDetails extends Base.Component<IBuildCompletionTriggerDetailsProps, IBuildCompletionTriggerState> {

    public constructor(props: IBuildCompletionTriggerDetailsProps) {
        super(props);

        this._sourcesSelectionStore = StoreManager.GetStore<SourcesSelectionStore>(SourcesSelectionStore);
        this._store = StoreManager.GetStore<BuildCompletionTriggerStore>(BuildCompletionTriggerStore);
        this._actionCreator = ActionCreatorManager.GetActionCreator<TriggersActionsCreator>(TriggersActionsCreator);
        this.state = this._store.getState();
    }

    public componentDidMount() {
        this._store.addChangedListener(this._onChange);
    }

    public componentWillUnmount() {
        this._store.removeChangedListener(this._onChange);
    }

    public render(): JSX.Element {
        if (this.props.index >= this.state.buildCompletionTriggers.length) {
            // This trigger no longer exists, nothing to render
            return null;
        }

        const myFilters = this.state.buildCompletionTriggers[this.props.index].trigger.branchFilters;

        const definitionTitle: string = this.state.buildCompletionTriggers[this.props.index].title;
        const definitionPathAndName: string = this.state.buildCompletionTriggers[this.props.index].defPathAndName;
        const isBranchFilterSupported: boolean = this.state.buildCompletionTriggers[this.props.index].isBranchFilterSupported;

        const repository: BuildRepository = this.state.buildCompletionTriggers[this.props.index].repository ? this.state.buildCompletionTriggers[this.props.index].repository : this._sourcesSelectionStore.getBuildRepository();
        const repositoryName: string = repository ? repository.name : Utils_String.empty;
        const repositoryType: string = repository ? repository.type : Utils_String.empty;

        return (
            <div className="build-completion-sub-container">
                <div className="trigger-details-header">
                    <div className="ms-Icon ms-Icon--Build trigger-icon" />
                    <div className="build-completion-summary">
                        <div className="triggering-definition-summary">
                            {definitionTitle ? definitionTitle : Resources.DefaultBuildCompletionTitle}
                        </div>
                    </div>
                    <div className="trigger-delete">
                        <ActionButton
                            ariaLabel={Resources.DeleteBuildCompletionTrigger}
                            className="delete-trigger-button"
                            onClick={(event: React.MouseEvent<HTMLButtonElement>) => { this._removeTrigger(this.props.index); }}
                            disabled={!!this.props.disabled}>
                            <i className="bowtie-icon bowtie-trash trigger-button-icon" aria-hidden="true"/> {Resources.DeleteBuildCompletionTrigger}
                        </ActionButton>
                    </div>
                </div>
                <div>
                    { this.state.isBuildCompletionEnabled && 
                    <div>
                        <div className="build-completion-trigger-definition">
                            <ComboBoxInputComponent
                                    label="Triggering build"
                                    source={this.state.definitionNames}
                                    onValueChanged={this._onSelectedDefinitionChanged}
                                    comboBoxType={ComboBoxType.Searchable}
                                    value={definitionPathAndName ? definitionPathAndName : ""}
                                    required={true}
                                    compareInputToItem={(key: any, compareText: any, matchPartial: boolean): number => {
                                        if (matchPartial) {
                                            if (Utils_String.caseInsensitiveContains(key, compareText)) {
                                                return 0;
                                            }
                                            return -1;
                                        }
                                        else {
                                            return Utils_String.localeIgnoreCaseComparer(key, compareText);
                                        }
                                    }}
                                    errorMessage={definitionPathAndName ? Resources.PipelineNotFound : Resources.SettingsRequired}
                                    fixDropWidth={true}
                                    disabled={!!this.props.disabled} />
                        </div>
                        {   isBranchFilterSupported && 
                            <Filters
                                key="build-completion-triggers-filters"
                                repository={repository}
                                repositoryType={repositoryType}
                                isFilterRequired={true}
                                onFilterOptionChange={this._onBranchFilterOptionChange}
                                filterType={FilterType.BranchFilter}
                                filters={myFilters}
                                onFilterChange={this._onBranchFilterChange}
                                onAddFilterClick={this._onAddBranchFilterClick}
                                onFilterDelete={this._onBranchFilterDelete}
                                isReadOnly={!!this.props.disabled} />
                        }

                        {
                            !this.state.buildCompletionTriggers[this.props.index].areBranchFiltersValid ?
                                <ErrorComponent
                                    errorMessage={Resources.AddBranchFilterError} />
                                : null
                        }
                    </div> }
                </div>
                
            </div>
        );
    }

    private _onChange = () => {
        this.setState(this._store.getState());
    }

    private _onBranchFilterOptionChange = (option: IDropdownOption, optionIndex: number, rowIndex: number): void => {
        let branchFilter: Actions.IUpdateBuildCompletionBranchFilter = {
            triggerId: this.props.index,
            branchFilter: optionIndex === 0 ? "+" : "-",
            filterIndex: rowIndex
        };
        this._actionCreator.changeBuildCompletionBranchFilterOption(branchFilter);
    }

    private _onBranchFilterChange = (branch: string, rowIndex: number): void => {
        let branchFilter: Actions.IUpdateBuildCompletionBranchFilter = {
            triggerId: this.props.index,
            branchFilter: branch,
            filterIndex: rowIndex
        };
        this._actionCreator.changeBuildCompletionBranchFilter(branchFilter);
    }

    private _onBranchFilterDelete = (rowIndex: number): void => {
        this._actionCreator.removeBuildCompletionBranchFilter(this.props.index, rowIndex);
    }

    private _onAddBranchFilterClick = (event: React.MouseEvent<HTMLButtonElement>): void => {
        this._actionCreator.addBuildCompletionBranchFilter(this.props.index, this._sourcesSelectionStore.getBuildRepository().defaultBranch);
        DtcUtils.scrollElementToView(event.currentTarget, Positioning.VerticalScrollBehavior.Bottom);
    }

    private _removeTrigger = (index: number): void => {
        let triggerInfo: Actions.IRemoveBuildCompletionTrigger = {
            triggerId: index
        };
        this._actionCreator.removeBuildCompletionTrigger(triggerInfo);

        if (this.props.onTriggerDeleted) {
            this.props.onTriggerDeleted(index);
        }
    }

    private _onSelectedDefinitionChanged = (selectedDefinition: string) => {
        this._actionCreator.updateBuildCompletionDefinition(this.props.index, selectedDefinition);
    }

    private _store: BuildCompletionTriggerStore;
    private _actionCreator: TriggersActionsCreator;
    private _sourcesSelectionStore: SourcesSelectionStore;
}
