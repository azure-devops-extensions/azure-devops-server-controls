/// <reference types="react" />
import * as React from "react";

import { Component, IProps } from "DistributedTaskControls/Common/Components/Base";
import { FormattedComponent } from "DistributedTaskControls/Common/Components/FormattedComponent";

import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import { IReleaseEnvironmentGatesStatusExitConditionData } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentGatesTypes";

import { ProgressIndicator } from "OfficeFabric/ProgressIndicator";
import { css } from "OfficeFabric/Utilities";

import * as Utils_HTML from "VSS/Utils/Html";
import { localeFormat, empty } from "VSS/Utils/String";
import { VssPersona } from "VSSUI/VssPersona";
import { Status, IStatusProps, StatusSize, Statuses } from "VSSUI/Status";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ApproversAndManualInterventionStatusMessageBar";
import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/Common/FabricStyleOverrides";

export interface IApproversAndManualInterventionStatusMessageBarProps extends IProps {
    messageBarClassName: string;
    statusIconProps: IStatusProps;
    timeoutTextFormat: string; // Will be shown on right
    timeoutTimeText: string;
    showTimeout: boolean;
    statusSubText: string;  // Shown just below the message bar title. If cancelledByUserDisplayName provided, can be used as a format
    statusTitleFormat: string; // Title of message bar in format form
    statusTitleSubText: string; // String used in statusTitleFormat
    canceledByUserDisplayName?: string;
    canceledByUserImageUrl?: string;
    exitConditionData?: IReleaseEnvironmentGatesStatusExitConditionData;
}

export interface IApproversAndManualInterventionStatusMessageBarState {
    imageError: boolean;
}

export class ApproversAndManualInterventionStatusMessageBar extends Component<IApproversAndManualInterventionStatusMessageBarProps, IApproversAndManualInterventionStatusMessageBarState> {

    public render(): JSX.Element {

        const messageBarClass = css(this.props.messageBarClassName, "release-status-message-bar");

        return <div className={messageBarClass}>
            {this._getMessageBarBody(this.props.statusIconProps)}
        </div>;
    }

    private _getFriendlyStringForTimespan(timespanInMinutes: number) {

        if (timespanInMinutes >= ApproversAndManualInterventionStatusMessageBar.c_minutesInHour) {
            return localeFormat(Resources.HourSuffix, Math.ceil(timespanInMinutes / ApproversAndManualInterventionStatusMessageBar.c_minutesInHour));
        }
        else {
            return localeFormat(Resources.MinutesSuffix, timespanInMinutes);
        }
    }

    private _getMessageBarBody(statusIconProps: IStatusProps): JSX.Element {

        let rightJsx: JSX.Element = null;
        if (this.props.showTimeout) {

            rightJsx = (
                <span className="message-bar-right-container">
                    <span className="message-bar-right-icon-container">
                        <Status {...Statuses.Waiting} size={StatusSize.s} className="message-bar-icon" />
                    </span>
                    <span className="message-bar-right-text">
                        <FormattedComponent format={this.props.timeoutTextFormat}>
                            <span className="right-dark">{this.props.timeoutTimeText}</span>
                        </FormattedComponent>
                    </span>
                </span>
            );
        }

        // subStatus text is the one coming below the main header.
        // For e.g., in case of MI --> timeout and permission policy for MI
        let statusSubText: string = this.props.statusSubText && Utils_HTML.HtmlNormalizer.normalize(this.props.statusSubText);
        {/* tslint:disable:react-no-dangerous-html */ }
        let statusSubTextContent: JSX.Element = (<div dangerouslySetInnerHTML={this._renderHtml(statusSubText)} />);
        {/* tslint:enable:react-no-dangerous-html */ }
        if (statusSubText && this.props.canceledByUserDisplayName) {
            statusSubTextContent = this._getCanceledSubTextContent();
        }
        else if (this.props.exitConditionData && this.props.exitConditionData.percentComplete) {
            statusSubTextContent = this._getExitConditionsSubTextContent();
        }

        return (
            <div>
                <div className="message-bar-header">
                    <Status {...statusIconProps} size={StatusSize.s} className="message-bar-icon" />
                    <FormattedComponent format={this.props.statusTitleFormat} className="title">
                        {/* The text being set is sanitized and not user entered */}
                        {/* tslint:disable:react-no-dangerous-html */}
                        <span className="header-subtext" dangerouslySetInnerHTML={this._renderHtml(this.props.statusTitleSubText)} />
                        {/* tslint:enable:react-no-dangerous-html */}
                    </FormattedComponent>
                    {rightJsx}

                </div>
                <div className="message-bar-subtext">
                    {statusSubTextContent}
                </div>
            </div>
        );
    }

    private _renderHtml(html: string) {
        return {
            __html: html
        };
    }

    private _getCanceledSubTextContent(): JSX.Element {
        return (
            <FormattedComponent format={this.props.statusSubText}>
                <span>
                    {
                        !this.state.imageError && this.props.canceledByUserImageUrl &&
                        <VssPersona
                            size={"extra-extra-small"}
                            onImageError={this._onImageError}
                            cssClass={"canceled-by-persona"}
                            identityDetailsProvider={{
                                getIdentityImageUrl: (size: number): string => {
                                    return this.props.canceledByUserImageUrl;
                                },
                                getDisplayName: (): string => {
                                    return this.props.canceledByUserDisplayName;
                                }
                            }}
                        />
                    }
                    <span>{this.props.canceledByUserDisplayName}</span>
                </span>
            </FormattedComponent>
        );
    }

    private _getExitConditionsSubTextContent(): JSX.Element {
        const progressIndicatorHeight = 5; // height of progress bar in pixels

        return (
            <div className="gates-progress">
                <ProgressIndicator
                    percentComplete={this.props.exitConditionData.percentComplete}
                    barHeight={progressIndicatorHeight}
                    ariaValueText={this.props.exitConditionData.ariaValueText}
                />
                <span className="title">{this.props.exitConditionData.timeRemaining}</span>
                <span className="message-bar-right-container">{this.props.exitConditionData.successDurationText}</span>
            </div>
        );
    }

    private _onImageError = (): void => {
        this.setState({ imageError: true });
    }

    private static readonly c_minutesInHour: number = 60;
}