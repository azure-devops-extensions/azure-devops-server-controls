/// <reference types="react" />

import "VSS/LoaderPlugins/Css!ScaledAgile/Scripts/Views/DeliveryTimeLine/Components/IntervalMessage";

import * as React from "react";
import * as VSS from "VSS/VSS";
import * as ScaledAgileResources from "ScaledAgile/Scripts/Resources/TFS.Resources.ScaledAgile";

import Events_Action = require("VSS/Events/Action");
import { Callout } from "OfficeFabric/Callout";
import { DirectionalHint } from "OfficeFabric/common/DirectionalHint";

import { KeyCode } from "VSS/Utils/UI";
import { TfsContext, IRouteData } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { ScaledAgileTelemetry } from "ScaledAgile/Scripts/Shared/Utils/Telemetry";
import { CoreFieldRefNames } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import { ITeam, IInterval } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Models/DeliveryTimeLineInterfaces";
import { Movement } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Models/DeliveryTimeLineModels";
import { IIntervalProps } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Components/Interval";
import { TimelineTeamStatusCode, TimelineIterationStatusCode } from "TFS/Work/Contracts";
import { IDeliveryTimeLineActionsCreator } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Actions/DeliveryTimeLineActionsCreator";
import { DeliveryTimelineFormattedMessage, IDeliveryTimelineFormattedMessageLink } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Components/DeliveryTimelineFormattedMessage";
import { TeamSettingUrls } from "Agile/Scripts/Common/HubUrlUtilities";

import * as Async_ConfigurationLauncher from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineConfiguration/Components/ConfigurationLauncher";

export class IntervalMessage extends React.Component<IIntervalProps, {}> {
    private _messageElement: OverlapIterations;
    private _errorElement: GenericError;
    private _links: IDeliveryTimelineFormattedMessageLink[];

    private _onNoIterationsManageIterationsKeyDown = (event: React.KeyboardEvent<HTMLElement>) => this._onLinkKeyDown(event, 0);
    private _onNoIterationsPlanSettingsKeyDown = (event: React.KeyboardEvent<HTMLElement>) => this._onLinkKeyDown(event, 1);

    private _onNoTeamFieldSelectAreasKeyDown = (event: React.KeyboardEvent<HTMLElement>) => this._onLinkKeyDown(event, 0);
    private _onNoTeamFieldPlanSettingsKeyDown = (event: React.KeyboardEvent<HTMLElement>) => this._onLinkKeyDown(event, 1);

    private _onTeamDoesNotExistPlanSettingsKeyDown = (event: React.KeyboardEvent<HTMLElement>) => this._onLinkKeyDown(event, 0);

    public focus(): void {
        if (this._messageElement) {
            this._messageElement.focus();
        }
        else if (this._errorElement) {
            this._errorElement.focus();
        }
    }

    public render(): JSX.Element {
        if (this.props.interval.status.type === TimelineIterationStatusCode.IsOverlapping) {
            // Render overlapping iterations message
            return <OverlapIterations ref={(e) => this._messageElement = e} showCompact={this.props.interval.width <= 250} onUpdateIterationsClick={this._openTeamAdminIterations} actionsCreator={this.props.actionsCreator} team={this.props.team} interval={this.props.interval} />;
        }
        else if (this.props.team.status.type === TimelineTeamStatusCode.NoIterationsExist) {
            // Render no iterations interval message
            const message = ScaledAgileResources.TeamDoesNotUseIterations;
            this._links = [
                { text: ScaledAgileResources.TeamDoesNotUseIterationsManageIterations, action: this._openTeamAdminIterations, onKeyDown: this._onNoIterationsManageIterationsKeyDown, role: "button" },
                { text: ScaledAgileResources.TeamDoesNotUseIterationsPlanSettings, action: this._openConfigurationToTeams, onKeyDown: this._onNoIterationsPlanSettingsKeyDown }
            ];
            return <GenericError ref={(e) => this._errorElement = e} message={message} links={this._links} />
        }
        else if (this.props.team.status.type === TimelineTeamStatusCode.MissingTeamFieldValue) {
            // Render no team field interval message
            const message = ScaledAgileResources.TeamDoesNotHaveTeamValues;
            this._links = [
                { text: ScaledAgileResources.TeamDoesNotHaveTeamValuesSelectAreas, action: this._openTeamAdminAreas, onKeyDown: this._onNoTeamFieldSelectAreasKeyDown },
                { text: ScaledAgileResources.TeamDoesNotHaveTeamValuesPlanSettings, action: this._openConfigurationToTeams, onKeyDown: this._onNoTeamFieldPlanSettingsKeyDown, role: "button" }
            ];
            return <GenericError ref={(e) => this._errorElement = e} message={message} links={this._links} />
        }
        else if (this.props.team.status.type === TimelineTeamStatusCode.DoesntExistOrAccessDenied) {
            // Render team does not exist or no permissions interval message
            const message = ScaledAgileResources.TeamDoesntExistOrAccessDenied;
            this._links = [
                { text: ScaledAgileResources.TeamDoesntExistOrAccessDeniedPlanSettings, action: this._openConfigurationToTeams, role: "button" }
            ];
            return <GenericError ref={(e) => this._errorElement = e} message={message} links={this._links} />
        }
        else {
            // Render generic error interval message
            return <GenericError message={this.props.team.status.message} />;
        }
    }

    private _onLinkKeyDown(event: React.KeyboardEvent<HTMLElement>, currentItemIndex: number) {
        if (event.keyCode === KeyCode.LEFT) {
            if (currentItemIndex === 0) {
                this.props.actionsCreator.focusAdjacentObjectToInterval(this.props.team, this.props.interval, Movement.Left);
            }
            else {
                this._errorElement.focusElement(currentItemIndex - 1);
            }
        }
        else if (event.keyCode === KeyCode.RIGHT) {
            if (currentItemIndex === this._links.length - 1) {
                this.props.actionsCreator.focusAdjacentObjectToInterval(this.props.team, this.props.interval, Movement.Right);
            }
            else {
                this._errorElement.focusElement(currentItemIndex + 1);
            }
        }
        else if (event.keyCode === KeyCode.ENTER || event.keyCode === KeyCode.SPACE) {
            this._links[currentItemIndex].action();
        }
    }

    private _openConfigurationToTeams = () => {
        ScaledAgileTelemetry.onOpenConfiguration(this.props.storeData.id, TimelineTeamStatusCode[this.props.team.status.type]);

        VSS.using(["ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineConfiguration/Components/ConfigurationLauncher"],
            (ConfigurationLauncher: typeof Async_ConfigurationLauncher) => {
                ConfigurationLauncher.open(this.props.storeData, ConfigurationLauncher.ConfigurationIds.TAB_TEAMS_ID);
            });
    };

    private _openTeamAdminIterations = () => {
        ScaledAgileTelemetry.onOpenTeamAdminIterations(this.props.storeData.id, TimelineTeamStatusCode[this.props.team.status.type]);

       const url = TeamSettingUrls.getTeamIterationSettingURL(TfsContext.getDefault(), this.props.team.projectId, this.props.team.id, "iterations"); 

        Events_Action.getService().performAction(Events_Action.CommonActions.ACTION_WINDOW_OPEN, {
                    url: url,
                    target: "_blank"} );
    };

    private _openTeamAdminAreas = () => {
        ScaledAgileTelemetry.onOpenTeamAdminAreas(this.props.storeData.id, TimelineTeamStatusCode[this.props.team.status.type]);

        const isAreaPath = this.props.team.teamFieldName === CoreFieldRefNames.AreaPath;
        const url = TfsContext.getDefault().getActionUrl("", "work", {
            area: "admin",
            project: this.props.team.projectId,
            team: this.props.team.id,
            _a: isAreaPath ? "areas" : "team-field"
        } as IRouteData);
        Events_Action.getService().performAction(Events_Action.CommonActions.ACTION_WINDOW_OPEN, {
                    url: url,
                    target: "_blank"} );
    };
}

interface IGenericErrorProps {
    message: string;
    links?: IDeliveryTimelineFormattedMessageLink[];
}

class GenericError extends React.Component<IGenericErrorProps, {}> {
    private _messageComponent: DeliveryTimelineFormattedMessage;

    public focus(): void {
        if (this.props.links && this.props.links.length > 0) {
            this._messageComponent.focus(0);
        }
    }

    public focusElement(index: number): void {
        if (this.props.links && index >= 0 && index < this.props.links.length) {
            this._messageComponent.focus(index);
        }
    }

    public render(): JSX.Element {
        return <div className="interval-message error">
            <div className="interval-message-content">
                <i className="bowtie-icon bowtie-status-failure" />
                <DeliveryTimelineFormattedMessage ref={(e) => this._messageComponent = e} message={this.props.message} links={this.props.links} />
            </div>
        </div>;
    }
}

interface IOverlapIterationsProps {
    actionsCreator: IDeliveryTimeLineActionsCreator;
    showCompact?: boolean;
    onUpdateIterationsClick: () => void;
    team: ITeam;
    interval: IInterval;
}

interface IOverlapIterationsState {
    isCalloutVisible: boolean;
}

class OverlapIterations extends React.Component<IOverlapIterationsProps, IOverlapIterationsState> {
    private _compactElement: HTMLElement;
    private _nonCompactElement: DeliveryTimelineFormattedMessage;

    constructor(props: IOverlapIterationsProps) {
        super(props);
        this.state = { isCalloutVisible: false };
    }

    public focus(): void {
        if (this._compactElement) {
            this._compactElement.focus();
        }
        else if (this._nonCompactElement) {
            this._nonCompactElement.focus(0);
        }
    }

    public render(): JSX.Element {
        const message = ScaledAgileResources.TeamHasOverlappingIterationDates;
        const links = [
            { text: ScaledAgileResources.TeamHasOverlappingIterationDatesUpdateIterations, action: this.props.onUpdateIterationsClick, role: "button", onKeyDown: this._onLinkKeyDown }
        ];

        let content: JSX.Element = null;
        if (this.props.showCompact) {
            content = <div className="interval-message-content">
                <span ref={(s: HTMLElement) => this._compactElement = s} style={{ cursor: "pointer" }} role="button" tabIndex={-1} onClick={this._toggleCallout} onKeyDown={this._onKeyDown}>
                    <i className="bowtie-icon bowtie-status-warning" />
                    <span>{ScaledAgileResources.Warning}</span>
                </span>
                {this.state.isCalloutVisible && (
                    <Callout
                        target={this._compactElement}
                        directionalHint={DirectionalHint.bottomAutoEdge}
                        onDismiss={this._onCalloutDismiss}
                        setInitialFocus={true}
                        gapSpace={0}>
                        <div style={{ width: 350, padding: 20 }}>
                            <DeliveryTimelineFormattedMessage message={message} links={links} />
                        </div>
                    </Callout>
                )}
            </div>;
        }
        else {
            content = <div className="interval-message-content">
                <i className="bowtie-icon bowtie-status-warning" />
                <DeliveryTimelineFormattedMessage ref={(e) => this._nonCompactElement = e} message={message} links={links} />
            </div>;
        }

        return <div className="interval-message warning">
            {content}
        </div>;
    }

    private _toggleCallout = () => {
        this.setState({ isCalloutVisible: !this.state.isCalloutVisible });
    };

    private _onCalloutDismiss = () => {
        this.setState({ isCalloutVisible: false });
    };

    private _onLinkKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
        this._handleKeyEvent(event);
        if (event.isDefaultPrevented()) {
            return;
        }

        if (event.keyCode === KeyCode.ENTER || event.keyCode === KeyCode.SPACE) {
            this.props.onUpdateIterationsClick();
        }
    };

    private _onKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
        this._handleKeyEvent(event);
        if (event.isDefaultPrevented()) {
            return;
        }

        if (event.keyCode === KeyCode.ENTER || event.keyCode === KeyCode.SPACE) {
            this._toggleCallout();
        }
    };

    private _handleKeyEvent(event: React.KeyboardEvent<HTMLElement>) {
        let direction: Movement = Movement.None;
        if (event.keyCode === KeyCode.LEFT) {
            direction = Movement.Left;
        }
        else if (event.keyCode === KeyCode.RIGHT) {
            direction = Movement.Right;
        }

        if (direction !== Movement.None) {
            this.props.actionsCreator.focusAdjacentObjectToInterval(this.props.team, this.props.interval, direction);
            event.stopPropagation();
            event.preventDefault();
        }
    }
}
