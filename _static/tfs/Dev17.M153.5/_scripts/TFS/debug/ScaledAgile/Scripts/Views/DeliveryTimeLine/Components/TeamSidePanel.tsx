/// <reference types="react" />

import * as React from "react";
import { FocusZone } from "OfficeFabric/FocusZone";
import { Link, ILink } from "OfficeFabric/Link";
import { TooltipHost, TooltipOverflowMode } from "VSSUI/Tooltip";
import { KeyCode } from "VSS/Utils/UI";
import { TfsContext, IRouteData } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { LinkHelpers } from "Agile/Scripts/Common/Agile";
import * as ScaledAgileResources from "ScaledAgile/Scripts/Resources/TFS.Resources.ScaledAgile";
import { ITeam, TeamAnchorFocusIdentifier, BacklogFocusIdentifier, TeamFocusType, IDeliveryTimeLineStoreData } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Models/DeliveryTimeLineInterfaces";
import { IDeliveryTimeLineActionsCreator } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Actions/DeliveryTimeLineActionsCreator";
import { DeliveryTimeLineViewConstants } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Components/Constants";
import { DeliveryTimelineFocusUtils } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Utils/DeliveryTimelineFocusUtils";
import { Movement } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Models/DeliveryTimeLineModels";

export interface ITeamSidePanelProps {
    actionsCreator: IDeliveryTimeLineActionsCreator;
    storeData: IDeliveryTimeLineStoreData;
    scrollingLeftOffset: number;
    team: ITeam;
    height: number;
}

/**
 * Display the team on the left of the team container
 */
export class TeamSidePanel extends React.Component<ITeamSidePanelProps, any> {

    private _teamDomElement: HTMLDivElement;
    private _focusTeam: boolean = false;
    private _backlogDomElement: ILink;
    private _focusBacklog: boolean = false;


    public render(): JSX.Element {
        const teamName = this.props.team.name || "";
        const backlogLevel = this.props.team.backlog.pluralName || "";
        const teamToFocus: TeamAnchorFocusIdentifier = DeliveryTimelineFocusUtils.getCurrentTeamFocusIdentifier(this.props.storeData);
        this._focusTeam = (teamToFocus && teamToFocus.teamKey === this.props.team.key);
        const backlogToFocus: BacklogFocusIdentifier = DeliveryTimelineFocusUtils.getCurrentBacklogFocusIdentifier(this.props.storeData);
        this._focusBacklog = (backlogToFocus && backlogToFocus.teamKey === this.props.team.key);

        const contextData = {
            level: this.props.team.backlog.pluralName
        };

        // After enabling New Agile Hubs everywhere, update this to get the new URL via getExternalBacklogContentURL in BacklogsUrls
        const url = LinkHelpers.getAsyncBacklogLink(/* action parameter*/ null, contextData, {
            project: this.props.team.projectId,
            team: this.props.team.id,
        } as IRouteData);

        return <div className="team-side-panel" style={this._getContainerStyles()} onClick={this._onExpandCollapseClick}>
            <header>
                {this._renderExpandCollapseButton()}
                <TooltipHost content={teamName} overflowMode={TooltipOverflowMode.Parent}>
                    <span className="team-name">{teamName}</span>
                </TooltipHost>
                <div className="team-backlog-name">
                    <TooltipHost content={backlogLevel} overflowMode={TooltipOverflowMode.Parent}>
                        <Link
                            componentRef={(e) => this._backlogDomElement = e}
                            tabIndex={-1}
                            href={url}
                            aria-label={`${backlogLevel}, ${this.props.team.name}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            data-is-focusable="true"
                            onClick={this._onBacklogClick}
                            onKeyDown={this._onBacklogKeyDown}>

                            {backlogLevel}
                        </Link>
                    </TooltipHost>
                </div>
            </header>
        </div>;
    }

    public componentDidMount() {
        this._focusAfterRender();
    }

    public componentDidUpdate() {
        this._focusAfterRender();
    }

    private _focusAfterRender() {
        if (this._teamDomElement && this._focusTeam) {
            // render() has been invoked but the actual element may not have been rendered by the browser yet. requestAnimationFrame() to force layout.
            window.requestAnimationFrame(() => {
                // By the time this happens things could have changed - so recheck to see if we still need to set focus.
                if (this._teamDomElement && this._focusTeam) {
                    this._teamDomElement.focus();
                    this._focusTeam = false;
                }
            });
        }
        else if (this._backlogDomElement && this._focusBacklog) {
            // render() has been invoked but the actual element may not have been rendered by the browser yet. requestAnimationFrame() to force layout.
            window.requestAnimationFrame(() => {
                // By the time this happens things could have changed - so recheck to see if we still need to set focus.
                if (this._backlogDomElement && this._focusBacklog) {
                    this._backlogDomElement.focus();
                    this._focusBacklog = false;
                }
            });
        }
    }

    private _getContainerStyles(): React.CSSProperties {
        const marginLeft = 10;

        return {
            left: this.props.scrollingLeftOffset,
            marginLeft: marginLeft,
            width: DeliveryTimeLineViewConstants.teamSidebarWidth - marginLeft - DeliveryTimeLineViewConstants.leftCurtainMarginRight,
            height: this.props.height,
            cursor: this.props.team.hasError() ? "default" : "pointer"
        };
    }

    private _renderExpandCollapseButton(): JSX.Element {
        let className = "bowtie-icon ";
        let toolTip: string;
        if (this.props.team.isCollapsed) {
            className += "bowtie-chevron-down";
            toolTip = ScaledAgileResources.ExpandTooltip;
        }
        else {
            className += "bowtie-chevron-up";
            toolTip = ScaledAgileResources.CollapseTooltip;
        }

        const hasError = this.props.team.hasError();
        let style: React.CSSProperties = null;
        if (hasError) {
            // If there is an error, we set the visiblity to hidden, so the component still takes space, and the alignment across rows looks consistent.
            style = { visibility: "hidden" };
        }
        const expandCollapseButton = <i
            ref={(element: HTMLDivElement) => { this._teamDomElement = element; }}
            className={className}
            style={style}
            aria-label={`${toolTip}, ${this.props.team.name} ${this.props.team.backlog.pluralName || ""}`}
            role="button"
            tabIndex={0}
            data-is-focusable={!hasError}
            onKeyDown={this._onTeamToggleKeyDown} />;

        if (hasError) {
            return expandCollapseButton;
        }
        else {
            return <TooltipHost content={toolTip}>
                {expandCollapseButton}
            </TooltipHost>;
        }
    }

    private _onExpandCollapseClick = () => {
        this.toggleExpandCollapse();
    };

    private _onTeamToggleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
        if (e.keyCode === KeyCode.ENTER || e.keyCode === KeyCode.SPACE) {
            this.toggleExpandCollapse();
            e.stopPropagation();
        }
        else if (!e.shiftKey && e.keyCode == KeyCode.RIGHT) {
            e.preventDefault();
            e.stopPropagation();
            this.props.actionsCreator.focusAdjacentObjectToTeam(this.props.team, Movement.Right);
        }
        else if (!e.shiftKey && e.keyCode === KeyCode.DOWN) {
            e.preventDefault();
            e.stopPropagation();
            this.props.actionsCreator.focusTeam(this.props.team, TeamFocusType.BacklogLink);
        }
        else {
            this._HookupIntervalToTeamEvent(e);
        }
    };

    private _onBacklogKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
        if (!e.shiftKey && e.keyCode === KeyCode.UP) {
            e.preventDefault();
            e.stopPropagation();
            this.props.actionsCreator.focusTeam(this.props.team, TeamFocusType.TeamToggle);
        }
        else if (!e.shiftKey && e.keyCode == KeyCode.RIGHT) {
            e.preventDefault();
            e.stopPropagation();
            this.props.actionsCreator.focusAdjacentObjectToTeam(this.props.team, Movement.Right);
        }
        else {
            this._HookupIntervalToTeamEvent(e);
        }
    };

    private _HookupIntervalToTeamEvent(e: React.KeyboardEvent<HTMLElement>) {
        if (e.shiftKey && e.keyCode === KeyCode.PAGE_UP) {
            e.stopPropagation();
            e.preventDefault();
            this.props.actionsCreator.focusAdjacentObjectToTeam(this.props.team, Movement.Up);
        }
        else if (e.shiftKey && e.keyCode === KeyCode.PAGE_DOWN) {
            e.stopPropagation();
            e.preventDefault();
            this.props.actionsCreator.focusAdjacentObjectToTeam(this.props.team, Movement.Down);
        }
    }

    private _onBacklogClick = (e: React.MouseEvent<HTMLElement>) => {
        e.stopPropagation();
    };

    public toggleExpandCollapse() {
        if (!this.props.team.hasError()) {
            this.props.actionsCreator.toggleExpandCollapseTeam(this.props.team);
        }
    }
}
