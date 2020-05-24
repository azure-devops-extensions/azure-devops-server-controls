import React = require("react");
import ReactDOM = require("react-dom");
import { Callout, ICalloutProps } from "OfficeFabric/Callout";
import { TooltipHost } from "VSSUI/Tooltip";
import { CommandButton } from "OfficeFabric/Button";
import { DirectionalHint } from "OfficeFabric/common/DirectionalHint";
import { css, getId } from "OfficeFabric/Utilities";

import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import { KeyboardAccesibleComponent } from "Presentation/Scripts/TFS/Components/KeyboardAccessible";

import { HistoryTabActionCreator } from "VersionControl/Scenarios/History/GitHistory/Actions/HistoryTabActionCreator";
import { GitHistorySearchCriteria, GitHistoryDataOptions, IMessage }
from "VersionControl/Scenarios/History/GitHistory/Actions/HistoryTabActionsHub";

import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import "VSS/LoaderPlugins/Css!VersionControl/GraphToggleCallout";

export interface GraphToggleCalloutProps {
    isChecked: boolean;
    message: IMessage;
    onGraphColumnToggleClick(show: boolean): void;
    onDismissMessage(): void;
}

export interface GraphToggleCalloutState {
    isMounted: boolean;
}

export class GraphToggleCallout extends React.Component<GraphToggleCalloutProps, GraphToggleCalloutState> {
    private _id: string;
    private _toggleButton: HTMLElement;

    constructor(props: GraphToggleCalloutProps, context?: any) {
        super(props, context);
        this._id = getId("graph-toggle-callout");
        this.state = { isMounted: false };
    }

    public componentDidMount(): void {
        this.setState({ isMounted: true });
    }

    public render(): JSX.Element {
        if (this.props.isChecked === undefined) {
            return null;
        }

        let tooltip: string;

        if (this.props.isChecked) {
            tooltip = VCResources.History_GraphToggleOnLabel;
        }
        else {
            tooltip = VCResources.History_GraphToggleOffLabel;
        }

        // Removed aria pressed property. Because of the presence of the On/Off text.
        // Otherwise screen readers will read On/Off twice.
        return (
            <div
                ref={(toggleButton: HTMLElement) => this._toggleButton = toggleButton}
                className={"graph-toggle-callout"}>
                <TooltipHost
                    id={this._id}
                    content={tooltip}
                    directionalHint={DirectionalHint.bottomCenter}>
                    <CommandButton
                        className={"graph-toggle-button"}
                        aria-describedby={this._id}
                        ariaLabel={VCResources.History_GraphToggleButtonAriaLabel}
                        onClick={() => this.props.onGraphColumnToggleClick(!this.props.isChecked)}>
                        <span className="bowtie bowtie-fabric">
                            <span className="bowtie-icon bowtie-git-graph" />
                        </span>
                        <span className="toggle-button-text">
                            {this.props.isChecked ? VCResources.OnText : VCResources.OffText}
                        </span>
                     </CommandButton>
                </TooltipHost>
                {this.props.message && this.state.isMounted &&
                    <Callout
                        target={this._toggleButton}
                        onDismiss={this.props.onDismissMessage}
                        directionalHint={DirectionalHint.bottomLeftEdge}
                        gapSpace={0}
                        beakWidth={16}
                        isBeakVisible={true}
                        setInitialFocus={true}>
                        <div className="graph-callout-details">
                            <span
                                className="callout-close-button bowtie-icon bowtie-navigate-close"
                                aria-label={VCResources.History_GraphCalloutCloseButtonAriaLabel}
                                onClick={this.props.onDismissMessage}
                                tabIndex={0}
                                role={"button"}/>
                            {this.props.message.title && (
                                <div
                                    className="title"
                                    aria-label={VCResources.History_GraphCalloutTitleAriaLabel}
                                    tabIndex={0}
                                    title={this.props.message.title}>
                                    {this.props.message.title}
                                </div>
                            )}
                            <div
                                className="text"
                                aria-label={VCResources.History_GraphCalloutContentAriaLabel}
                                tabIndex={0}
                                title={this.props.message.content}>
                                {this.props.message.content}
                            </div>
                        </div>
                    </Callout>
                }
            </div>
        );
    }
}