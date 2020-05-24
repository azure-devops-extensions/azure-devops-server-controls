import * as React from "react";
import * as ReactDOM from "react-dom";

import { empty as emptyString } from "VSS/Utils/String";

import { Component, IProps } from "DistributedTaskControls/Common/Components/Base";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { TwoPanelSelectorComponent } from "DistributedTaskControls/Components/TwoPanelSelectorComponent";
import { Component as InformationBar } from "DistributedTaskControls/Components/InformationBar";
import { Actions as ItemSelectorActions } from "DistributedTaskControls/Actions/ItemSelectorActions";

import { TabContentContainer } from "TaskGroup/Scripts/TaskGroupEditor/TabContentContainer/TabContentContainer";
import { TaskGroupReferencesViewStore, ITaskGroupReferencesViewState } from "TaskGroup/Scripts/TaskGroupEditor/References/TaskGroupReferencesViewStore";
import { TabInstanceIds, Dimesnions } from "TaskGroup/Scripts/TaskGroupEditor/Constants";
import * as Resources from "TaskGroup/Scripts/Resources/TFS.Resources.TaskGroup";

import "VSS/LoaderPlugins/Css!TaskGroup/Scripts/TaskGroupEditor/References/TaskGroupReferences";

export interface ITaskGroupReferencesProps extends IProps {
    fromExtension: boolean;
}

export class TaskGroupReferences extends Component<ITaskGroupReferencesProps, ITaskGroupReferencesViewState>{
    constructor(props: ITaskGroupReferencesProps) {
        super(props);
        this._taskGroupReferencesViewStore = StoreManager.GetStore<TaskGroupReferencesViewStore>(TaskGroupReferencesViewStore);
    }

    public render() {
        return (
            <TabContentContainer
                cssClass={"task-group-references"}
                tabInstanceId={TabInstanceIds.References}
                fromExtension={this.props.fromExtension}
            >
                {
                    (!!this.state.referenceItems
                        && this.state.referenceItems.length > 0
                        &&
                        <TwoPanelSelectorComponent
                            cssClass="task-group-ref-twopanels"
                            items={this.state.referenceItems}
                            defaultItemKey={(!!this.state.referenceItems[0]) ? this.state.referenceItems[0].getKey() : emptyString}
                            leftPaneARIARegionRoleLabel={Resources.ReferencesTabLeftAriaLabel}
                            rightPaneARIARegionRoleLabel={Resources.ReferencesTabRightAriaLabel}
                            leftPaneInitialWidth={Dimesnions.TaskGroupReferencesLeftPaneWidth}
                            setFocusOnLastSelectedItem={false} />)

                    || (
                        !this.state.referenceItems
                        &&
                        <div className={"loading-references-message"}>
                            {Resources.LoadingReferencesText}
                        </div>
                    )
                }
            </TabContentContainer>
        );
    }

    public componentWillMount(): void {
        this.setState(this._taskGroupReferencesViewStore.getState());
        this._taskGroupReferencesViewStore.addChangedListener(this._onStoreChange);
    }

    public componentWillUnmount(): void {
        this._taskGroupReferencesViewStore.removeChangedListener(this._onStoreChange);
    }

    private _onStoreChange = () => {
        const state = this._taskGroupReferencesViewStore.getState();

        // Unmounting the two panel compenent is leading to error - "Failed to execute 'removeChild' on 'Node'"
        // Not sure about the cause, but handling it this way for the time being
        if (!state.referenceItems && !!this.state.referenceItems) {
            return;
        }

        this.setState(state);

        // Reset the selection once the store updates
        setTimeout(() => {
            const itemSelectorActions = ActionsHubManager.GetActionsHub<ItemSelectorActions>(ItemSelectorActions);
            itemSelectorActions.updateSelection.invoke([{ data: state.referenceItems[0] }]);
        }, 10);
    }

    private _taskGroupReferencesViewStore: TaskGroupReferencesViewStore;
}