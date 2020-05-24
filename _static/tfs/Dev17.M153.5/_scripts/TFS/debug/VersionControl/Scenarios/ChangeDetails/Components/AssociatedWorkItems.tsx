import * as React from "react";

import { autobind } from 'OfficeFabric/Utilities';
import * as Events_Action from "VSS/Events/Action";

import {
    IHostArtifact,
    IInternalLinkedArtifactDisplayData,
    ViewMode,
} from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Contracts";
import { LinkedArtifactsControl } from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Control";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { LinkedWorkItemDataProviderConstants } from "WorkItemTracking/Scripts/DataProviders/LinkedWorkItemDataProvider";
import { WorkItemActions } from "WorkItemTracking/Scripts/Utils/WorkItemControlsActions";

import { mapWorkItemIdToLinkedArtifact } from "VersionControl/Scripts/Utils/WorkItemLinkUtils";

export interface IAssociatedWorkItemsProps {
    associatedWorkItemIds: number[];
    tfsContext: TfsContext;
    getWorkItemDisplayData(key: string): IInternalLinkedArtifactDisplayData;
    setWorkItemDisplayData(key: string, value: IInternalLinkedArtifactDisplayData): void;
    invalidateWorkItemDisplayData(key: string): void;
    hostArtifact: IHostArtifact;
}

/**
 * Rendering container for Associcated work items in flyout
 */
export class AssociatedWorkItems extends React.Component<IAssociatedWorkItemsProps, {}> {
    public render(): JSX.Element {
        return (
            <LinkedArtifactsControl
                linkTypeRefNames={null}
                tfsContext={this.props.tfsContext}
                viewOptions={{
                    viewMode: ViewMode.List,
                    showGroupHeaders: false
                }}
                readOnly={true}
                hostArtifact={this.props.hostArtifact}
                linkedArtifacts={this.props.associatedWorkItemIds.map(mapWorkItemIdToLinkedArtifact)}
                cache={{
                    set: (key: string, value: IInternalLinkedArtifactDisplayData) => this.props.setWorkItemDisplayData(key, value),
                    get: (key: string) => this.props.getWorkItemDisplayData(key),
                    invalidate: (key: string) => this.props.invalidateWorkItemDisplayData(key)
                }} />);
    }

    public componentWillMount(): void {
        /*
         * This is to fix bug:#1150226 where callout overlaps work item form.
         * Handling the work item open action so that the form always open in a new tab.
         */
        Events_Action.getService().registerActionWorker(
            WorkItemActions.ACTION_WORKITEM_OPEN,
            this._onWorkItemOpenHandler,
            0,
        );
    }

    public componentWillUnmount(): void {
        Events_Action.getService().unregisterActionWorker(
            WorkItemActions.ACTION_WORKITEM_OPEN,
            this._onWorkItemOpenHandler,
        );
    }

    @autobind
    private _onWorkItemOpenHandler(): string {
        return LinkedWorkItemDataProviderConstants.WorkItemOpenNotHandled;
    }
}
