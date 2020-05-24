import * as React from "react";

import "VSS/LoaderPlugins/Css!Agile/Scripts/BacklogsHub/Planning/Components/PlanningRow";
import { BacklogIterationCard } from "Agile/Scripts/BacklogsHub/Planning/Components/BacklogIterationCard";
import { DragDropScopes } from "Agile/Scripts/Common/Agile";
import { IIterationCardProps, IterationCard } from "Agile/Scripts/Common/Components/IterationCard/IterationCard";
import { MoveToIterationHelper } from "Agile/Scripts/Common/Utils";
import { Iteration } from "Agile/Scripts/Models/Iteration";
import { SimpleDropZone } from "Presentation/Scripts/TFS/Components/SimpleDropZone";
import { BacklogConfigurationService } from "Presentation/Scripts/TFS/FeatureRef/BacklogConfiguration/Service";
import { IWorkItemDragInfo } from "Agile/Scripts/Common/IWorkItemDragInfo";

export interface IPlanningRowProps extends IIterationCardProps {
    /** Is this iteration the backlog iteration */
    isBacklogIteration?: boolean;
    /** The URL to show as the href on the backlog row header link */
    backlogUrl?: string;
    /** Get the current work items that are being dragged */
    getWorkItemDragInfo: ($item: JQuery) => IWorkItemDragInfo;
    /** Handler for when work items are dropped on this row */
    onWorkItemsDropped?: (workItemIds: number[], iterationPath: string, $item: JQuery) => void;
    /** Callback invoked when the backlog row is clicked */
    onBacklogClicked?: (event: React.MouseEvent<HTMLElement>) => void;
    /** On Iteration clicked */
    onIterationClicked?: (event: React.MouseEvent<HTMLElement>, iteration: Iteration) => void;
}

export interface IPlanningRowState {
    /** Is the context menu visible */
    contextMenuVisible: boolean;
}

/**
 * Renders an iteration in a work item drop zone
 */
export class PlanningRow extends React.Component<IPlanningRowProps, IPlanningRowState> {
    constructor(props: IPlanningRowProps, context: any) {
        super(props, context);
        this.state = {
            contextMenuVisible: false
        };
    }

    public render(): JSX.Element {
        const {
            isBacklogIteration,
            iteration
        } = this.props;

        const cardProps = { ...this.props };
        delete cardProps.onWorkItemsDropped;
        delete cardProps.isBacklogIteration;

        return (
            <SimpleDropZone
                droppableOptions={{
                    accept: this._accept,
                    activeClass: "sprint-planning-row--active",
                    drop: this._onDrop,
                    scope: DragDropScopes.ProductBacklog,
                    tolerance: "pointer",
                    hoverClass: "sprint-planning-row--drag-hover"
                }}
                className="sprint-planning-row"

            >
                {isBacklogIteration ?
                    <BacklogIterationCard
                        iteration={iteration}
                        onClick={this.props.onBacklogClicked}
                        backlogUrl={this.props.backlogUrl}
                    /> :
                    <IterationCard
                        {...cardProps}
                    />
                }
            </SimpleDropZone>
        );
    }

    private _accept = ($item: JQuery): boolean => {
        const {
            isBacklogIteration,
            getWorkItemDragInfo
        } = this.props;

        const {
            areAllItemsOwned,
            selectedWorkItemTypes
        } = getWorkItemDragInfo($item);

        const moveToIterationHelper = new MoveToIterationHelper();

        if (isBacklogIteration) {
            return moveToIterationHelper.canMoveToBacklog(selectedWorkItemTypes, areAllItemsOwned, BacklogConfigurationService.getBacklogConfiguration().requirementBacklog.name);
        }

        return moveToIterationHelper.canMoveToIteration(selectedWorkItemTypes, areAllItemsOwned);
    }

    private _onDrop = (event: JQueryEventObject, ui: JQueryUI.DroppableEventUIParam): void => {
        const {
            getWorkItemDragInfo,
            iteration,
            onWorkItemsDropped
        } = this.props;

        if (onWorkItemsDropped) {
            const $item = ui.draggable;
            const {
                selectedWorkItemIds
            } = getWorkItemDragInfo($item);

            onWorkItemsDropped(selectedWorkItemIds, iteration.iterationPath, $item);
        }
    }
}