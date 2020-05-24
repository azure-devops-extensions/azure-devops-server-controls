/// <reference types="react" />

import * as React from "react";

import { css } from "OfficeFabric/Utilities";
import { TooltipHost, TooltipOverflowMode, DirectionalHint } from "VSSUI/Tooltip";
import { DefaultButton, IconButton } from "OfficeFabric/Button";

import * as Base from "DistributedTaskControls/Common/Components/Base";

import { IReleaseEnvironmentActionInfo } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentTypes";
import { ReleaseProgressCanvasTelemetryHelper } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseProgressCanvasTelemetryHelper";
import { ReleaseEnvironmentStatusHelper } from "PipelineWorkflow/Scripts/Shared/Utils/ReleaseEnvironmentStatusHelper";

import { curry } from "VSS/Utils/Core";

export interface IAction extends IReleaseEnvironmentActionInfo {
    isHidden?: boolean;
    render?: (item: any) => JSX.Element;
    onClick?: () => void;
    largeSize?: boolean;
}

export interface IReleaseEnvironmentNodeActionsCommandBarProps extends Base.IProps {
    actions: IAction[];
    showIconButtons?: boolean;
    isImportantActionAvaiable?: boolean;
}

export class ReleaseEnvironmentNodeActionsCommandBar extends Base.Component<IReleaseEnvironmentNodeActionsCommandBarProps, Base.IStateless> {
    public render(): JSX.Element {
        return (
            this._getEnvironmentNodeActions()
        );
    }

    private _getEnvironmentNodeActions(): JSX.Element {
        const actionButtons: IAction[] = this.props.actions;
        const isImportantActionAvaiable = this.props.isImportantActionAvaiable;
        if (actionButtons) {
            return (
                <div className="cd-environment-actions">
                    {
                        actionButtons.map((action, index) => {
                            if (action.render) {
                                return action.render(action);
                            }
                            else {

                                let commonProps = {
                                    onClick: curry(this._onClick, action),
                                    disabled: action.isDisabled, //enabled is default
                                    "aria-hidden": true,
                                    tabIndex: -1,
                                    primary: action.isImportant,
                                    iconProps: {
                                        iconName: ReleaseEnvironmentStatusHelper.getActionIcon(action.action),
                                        className: "cd-environment-action-button-icon"
                                    },
                                    ariaDescription: action.actionText,
                                    className: css(
                                        "cd-environment-action-button",
                                        ("cd-environment-" + (action.action.toLowerCase()) + "-button"),
                                        { "cd-environment-action-button-visible": action.isImportant },
                                        { "cd-environment-action-button-hidden": action.isHidden }
                                    )
                                };

                                if ((!isImportantActionAvaiable && index === 0) || action.isImportant || !this.props.showIconButtons) {
                                    return (
                                        <DefaultButton
                                            children={
                                                <div className="cd-environment-action-button-content">
                                                    <TooltipHost
                                                        directionalHint={DirectionalHint.rightCenter}
                                                        overflowMode={TooltipOverflowMode.Parent}
                                                        content={action.actionText}>
                                                        {action.actionText}
                                                    </TooltipHost>
                                                </div>
                                            }
                                            key={(action.action + "button" + this.props.instanceId + index)}
                                            {...commonProps}
                                            className={css(
                                                commonProps.className,
                                                { "cd-environment-action-button-large": !!action.largeSize }
                                            )}
                                        />);
                                }
                                else {
                                    return (
                                        <TooltipHost
                                            key={(action.action + "button" + this.props.instanceId + index)}
                                            directionalHint={DirectionalHint.bottomCenter}
                                            content={action.actionTooltip}>
                                            <IconButton
                                                {...commonProps}
                                                className={css(
                                                    commonProps.className,
                                                    "cd-environment-action-icon-button"
                                                )}
                                            />
                                        </TooltipHost>
                                    );
                                }

                            }
                        })
                    }
                </div>
            );
        }
        else {
            return null;
        }
    }

    private _onClick = (action: IAction): void => {
        if (action && action.onClick) {
            action.onClick();
            ReleaseProgressCanvasTelemetryHelper.publishClickActionTelemetry(action.action);
        }
    }
}