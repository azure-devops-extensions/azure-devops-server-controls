import * as React from "react";

import * as DiscussionResources from "Presentation/Scripts/TFS/Resources/TFS.Resources.Discussion";
import { DiscussionThread } from "Presentation/Scripts/TFS/TFS.Discussion.Common";
import { DiscussionStatus } from "Presentation/Scripts/TFS/Generated/TFS.Discussion.Constants";

import { ServiceRegistry } from "VersionControl/Scenarios/Shared/ServiceRegistry";
import { IDiscussionActionCreator } from "VersionControl/Scripts/Actions/PullRequestReview/IDiscussionActionCreator";
import { ContextualMenu, DirectionalHint, IContextualMenuItem } from "OfficeFabric/ContextualMenu";
import { autobind } from "OfficeFabric/Utilities";
import { DefaultButton } from "OfficeFabric/Button";
import VSS_Telemetry = require("VSS/Telemetry/Services");
import * as Utils_String from "VSS/Utils/String";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";

export interface IDiscussionThreadStatusMenuProps extends React.Props<void> {
    thread: DiscussionThread;
    isDisabled?: boolean;

    onMenuExpanded?(): void;
    onMenuCollapsed?(): void;
}

export interface IDiscussionThreadStatusMenuState {
    isContextMenuVisible?: boolean;
    target?: HTMLElement;
}

export class DiscussionThreadStatusMenu extends React.Component<IDiscussionThreadStatusMenuProps, IDiscussionThreadStatusMenuState> {
    constructor(props) {
        super(props);

        this.state = {
            isContextMenuVisible: false,
            target: null,
        }
    }

    public render(): JSX.Element {
        const statusString = this._stringForStatus(this.props.thread.status);

        return <div role="menu" className={"vc-discussion-thread-status-menu"}>
            <DefaultButton className={"vc-discussion-thread-status-menu-button"}
                onClick={this._onClick}
                disabled={this.props.isDisabled}
                ariaLabel={VCResources.DiscussionThreadStatusLabel}
                role={"menuitem"}
                aria-haspopup={"true"}>
                {statusString}
                <i className="bowtie-icon bowtie-chevron-down"></i>
            </DefaultButton>
            {this.state.isContextMenuVisible &&
                <ContextualMenu
                    className={"vc-discussion-thread-status-menu-popup"}
                    items={this._getMenuItems()}
                    gapSpace={5}
                    target={this.state.target}
                    onDismiss={this._onDismiss}
                    directionalHint={DirectionalHint.bottomRightEdge}/>
            }
        </div>;
    }

    public shouldComponentUpdate(nextProps: IDiscussionThreadStatusMenuProps, nextState: IDiscussionThreadStatusMenuState) {
        const changed = this.props.thread.status !== nextProps.thread.status ||
            this.state.isContextMenuVisible !== nextState.isContextMenuVisible;
        return changed;
    }

    @autobind
    private _onClick(event: React.MouseEvent<HTMLButtonElement>): void {
        this.setState({
            target: event.target as HTMLElement,
            isContextMenuVisible: true
        });

        this.props.onMenuExpanded && this.props.onMenuExpanded();
    }

    @autobind
    private _onDismiss(event): void {
        this.setState({
            isContextMenuVisible: false
        });

        this.props.onMenuExpanded && this.props.onMenuCollapsed();
    }

    @autobind
    private _onItemClicked(ev?: React.MouseEvent<HTMLElement>, item?: IContextualMenuItem): void {
        const telemetryEvent = new VSS_Telemetry.TelemetryEventData(
            CustomerIntelligenceConstants.VERSION_CONTROL_AREA,
            CustomerIntelligenceConstants.PULL_REQUEST_DISCUSSION_CHANGE_STATUS_FEATURE, {
                oldStatus: this.props.thread.status,
                newStatus: item.data as DiscussionStatus,
            });
        VSS_Telemetry.publishEvent(telemetryEvent);

        const discussionActionCreator = ServiceRegistry.getService(IDiscussionActionCreator);
        discussionActionCreator.setThreadStatus(this.props.thread, item.data as DiscussionStatus);
    }
    
    private _getMenuItems(): IContextualMenuItem[] {
        const menuItems = [];

        const statusList: DiscussionStatus[] = [];
        statusList.push(DiscussionStatus.Active);
        statusList.push(DiscussionStatus.Pending);
        statusList.push(DiscussionStatus.Fixed);
        statusList.push(DiscussionStatus.WontFix);
        statusList.push(DiscussionStatus.Closed);

        statusList.forEach((status, index) => {
            menuItems.push({
                key: "" + index,
                name: this._stringForStatus(status),
                onClick: this._onItemClicked,
                data: status,
                checked: status === this.props.thread.status,
                canCheck: true,
            });
        });

        return menuItems;
    }

    private _stringForStatus(status: DiscussionStatus): string {
        switch (status) {
            case DiscussionStatus.Active:
                return DiscussionResources.DiscussionStatusActive;
            case DiscussionStatus.Closed:
                return DiscussionResources.DiscussionStatusClosed;
            case DiscussionStatus.Fixed:
                return DiscussionResources.DiscussionStatusResolved;
            case DiscussionStatus.WontFix:
                return DiscussionResources.DiscussionStatusWontfix;
            case DiscussionStatus.Pending:
                return DiscussionResources.DiscussionStatusPending;
            default:
                return DiscussionResources.DiscussionStatusActive;
        }
    }
}
