/// <reference types="react" />

import * as React from "react";
import * as ReactDOM from "react-dom";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { JQueryWrapper } from "DistributedTaskControls/Common/JQueryWrapper";
import { Telemetry } from "DistributedTaskControls/Common/Telemetry";
import { TooltipIfOverflow } from "DistributedTaskControls/Components/TooltipIfOverflow";

import { IContextualMenuItem } from "OfficeFabric/ContextualMenu";

import { EditorActions, EditorFeatures } from "PipelineWorkflow/Scripts/Editor/Common/Constants";
import { FeatureFlagUtils } from "PipelineWorkflow/Scripts/Shared/Utils/FeatureFlagUtils";
import { TaskTabEnvironmentDropdown } from "PipelineWorkflow/Scripts/Editor/ContainerTabs/TaskTab/TaskTabEnvironmentDropdown";
import { TaskTabStore } from "PipelineWorkflow/Scripts/Editor/ContainerTabs/TaskTab/TaskTabStore";
import { DeployEnvironmentStore } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentStore";
import { EnvironmentListStore } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentListStore";
import { NavigationStateUtils } from "PipelineWorkflow/Scripts/Common/NavigationStateUtils";
import { TaskTabActionsCreator } from "PipelineWorkflow/Scripts/Shared/ContainerTabs/TaskTab/TaskTabActionsCreator";

import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import { css } from "OfficeFabric/Utilities";

import * as NavigationService from "VSS/Navigation/Services";
import * as Utils_String from "VSS/Utils/String";
import * as Utils_UI from "VSS/Utils/UI";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/Editor/ContainerTabs/TaskTab/TaskTabCustomRenderer";

export interface ITaskTabCustomRendererState extends Base.IState {
    showEnvironmentDropDown: boolean;
}

export class TaskTabCustomRenderer extends Base.Component<Base.IProps, ITaskTabCustomRendererState> {

    public componentWillMount(): void {
        this.setState({
            showEnvironmentDropDown: false
        });

        this._taskTabStore = StoreManager.GetStore<TaskTabStore>(TaskTabStore);
        this._environmentListStore = StoreManager.GetStore<EnvironmentListStore>(EnvironmentListStore);
        this._taskTabActionsCreator = ActionCreatorManager.GetActionCreator<TaskTabActionsCreator>(TaskTabActionsCreator);
    }

    public render(): JSX.Element {
        const selectedEnvironmentStore: DeployEnvironmentStore = this._taskTabStore.getSelectedEnvironmentStore();
        const environmentDropdownIcon = <i className="environment-dropdown-chevron ms-Icon ms-Icon--ChevronDown" aria-hidden="true" onClick={this._onEnvironmentDropdownClicked} />;
        const showEnvironmentDropDown: boolean = !!selectedEnvironmentStore && this.state.showEnvironmentDropDown;

        if (this._taskTabButton) {
            this._taskTabButton.setAttribute("aria-expanded", showEnvironmentDropDown.toString());
            if (showEnvironmentDropDown) {
                this._taskTabButton.setAttribute("aria-owns", this._menuElementId);
            }
            else {
                this._taskTabButton.removeAttribute("aria-owns");
            }
        }

        return (
            <div className="task-tab-custom-renderer-container">
                <div className="task-tab-custom-renderer"
                    ref={(element) => { this._taskTabRef = element; }}>
                    {this.props.children}
                    {
                        !!selectedEnvironmentStore && environmentDropdownIcon
                    }

                </div>
                <TaskTabEnvironmentDropdown
                    menuElementId={this._menuElementId}
                    taskTabRef={this._taskTabRef}
                    environmentList={this._getEnvironmentList()}
                    onDismiss={this._onDismiss}
                    showDropDown={showEnvironmentDropDown} />
            </div>
        );
    }

    public componentDidMount(): void {
        this._componentIsMounted = true;
        // Todo: Stop making assumption that tab is button. Read the root element perhaps. TASK 1013927
        this._taskTabButton = JQueryWrapper.closest(ReactDOM.findDOMNode(this._taskTabRef) as Element, "button");
        if (this._taskTabButton) {
            this._taskTabButton.addEventListener("keydown", this._showEnvironmentDropDownOnKeyPress);
            this._taskTabButton.addEventListener("mouseover", this._onTaskTabMouseOver);
            this._taskTabButton.addEventListener("mouseleave", this._onTaskTabMouseLeave);
            this._taskTabButton.setAttribute("aria-expanded", this.state.showEnvironmentDropDown.toString());
        }
    }

    public componentWillUnmount(): void {
        this._componentIsMounted = false;
        if (this._taskTabButton) {
            this._taskTabButton.removeEventListener("keydown", this._showEnvironmentDropDownOnKeyPress);
            this._taskTabButton.removeEventListener("mouseover", this._onTaskTabMouseOver);
            this._taskTabButton.removeEventListener("mouseleave", this._onTaskTabMouseLeave);
        }
    }

    private _getEnvironmentList(): IContextualMenuItem[] {
        let storeList: DeployEnvironmentStore[] = this._environmentListStore.getDataStoreList();
        return storeList.map((environmentStore: DeployEnvironmentStore) => {
            return {
                key: environmentStore.getInstanceId(),
                name: environmentStore.getEnvironmentName(),
                ariaLabel: environmentStore.getEnvironmentName(),
                data: environmentStore,
                onRender: this._renderContextualMenuItem
            } as IContributedMenuItem;
        }) as IContextualMenuItem[];
    }

    private _onTaskTabMouseOver = () => {
        // setting the timer so that we don't show the dropdown immediately, as user not necessary want
        // to see environment dropdown. He may just be passing by.
        this._isMouseOnTab = true;
        this._showEnvironmentDropdownTimer = setTimeout(() => { this._toggleEnvironmentDropDown(this._isMouseOnTab); }, this._dropdownDelay);
    }

    private _onTaskTabMouseLeave = () => {
        this._isMouseOnTab = false;
        // in case user just passed by clear the timer that mouseover set so that we do not show the dropdown.
        clearTimeout(this._showEnvironmentDropdownTimer);
        // in case the drop down is visible and user leaves the tab hide the dropdown after 300 ms
        setTimeout(() => { this._toggleEnvironmentDropDown(this._isMouseOnTab); }, this._dropdownDelay);
    }

    private _renderContextualMenuItem = (item: IContextualMenuItem) => {
        let selectedEnvironmentStore: DeployEnvironmentStore = this._taskTabStore.getSelectedEnvironmentStore();
        let environmentStore: DeployEnvironmentStore = item.data;
        let environmentName: string = environmentStore.getEnvironmentName();
        let isEnvironmentValid: boolean = environmentStore.isEnvironmentWorkflowValid();
        let environmentIconName: string = (isEnvironmentValid) ? Utils_String.empty : "environment-error-icon bowtie-icon bowtie-status-error-outline";
        const isSelected = environmentStore.getInstanceId() === selectedEnvironmentStore.getInstanceId();
        const descriptionId = "environment-name-desciption" + Utils_String.generateUID();
        const selectionDescription = isSelected ? Resources.EnvironmentSelected : null;

        return (
            <div className={css("environment-drop-down-item", "ms-ContextualMenu-link", { "invalid-envrionment": !isEnvironmentValid })}
                key={environmentStore.getInstanceId()}
                role="menuitem"
                data-is-focusable="true"
                aria-label={environmentName}
                aria-describedby={descriptionId}
                onClick={() => { this._onContextualMenuItemClick(environmentStore, selectedEnvironmentStore); }}>
                <div id={descriptionId} className="hidden">{selectionDescription}</div>
                <div className="environment-icon-name-container">
                    <div className={environmentIconName} aria-hidden="true" />

                    <div className={css("environment-name-text", { "selected-environment-name-text": isSelected })}>{environmentName}</div>
                </div>

                {
                    isSelected &&
                    <div className="selected-environment-icon bowtie-icon bowtie-status-success" aria-hidden="true" />
                }
            </div>
        );
    }

    private _onContextualMenuItemClick = (newEnvironmentStore: DeployEnvironmentStore, prevEnvironmentStore: DeployEnvironmentStore) => {
        this._toggleEnvironmentDropDown(false);
        const action = NavigationStateUtils.getAction().toLowerCase();

        if (action !== EditorActions.ACTION_TASKS_TAB || newEnvironmentStore.getInstanceId() !== prevEnvironmentStore.getInstanceId()) {
            this._taskTabActionsCreator.selectEnvironment(newEnvironmentStore.getEnvironmentId());

            NavigationService.getHistoryService().addHistoryPoint(EditorActions.ACTION_TASKS_TAB,
                { environmentId: newEnvironmentStore.getEnvironmentId() });

            Telemetry.instance().publishEvent(EditorFeatures.EnvironmentSelector, {
                "environmentSwitched": true
            });
        }
    }

    private _toggleEnvironmentDropDown(isVisible: boolean) {
        this.setState({
            showEnvironmentDropDown: isVisible
        });
    }

    private _onEnvironmentDropdownClicked = (event) => {
        event.preventDefault();
        event.stopPropagation();

        this._toggleEnvironmentDropDown(true);
    }

    private _showEnvironmentDropDownOnKeyPress = (event) => {
        if (this._componentIsMounted && (event as JQueryKeyEventObject).keyCode === Utils_UI.KeyCode.DOWN) {
            this._toggleEnvironmentDropDown(true);
        }
    }

    private _onDismiss = () => {
        this._toggleEnvironmentDropDown(false);
    }

    private _componentIsMounted: boolean;
    private _taskTabRef: HTMLDivElement;
    private _taskTabStore: TaskTabStore;
    private _showEnvironmentDropdownTimer: any;
    private _environmentListStore: EnvironmentListStore;
    private _taskTabActionsCreator: TaskTabActionsCreator;
    private _isMouseOnTab: boolean = false;
    private _taskTabButton: Element;
    private readonly _dropdownDelay: number = 300;
    private readonly _menuElementId: string = "task-tab-environment-menu";
}
