// Copyright (c) Microsoft Corporation.  All rights reserved.

import * as React from "react";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import { FocusableContainer } from "DistributedTaskControls/Components/FocusableContainer";
import { IDateTimeSchedule } from "DistributedTaskControls/Common/Types";
import { ScheduleIntegrationUtils } from "DistributedTaskControls/Common/ScheduleIntegrationUtils";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { ErrorComponent } from "DistributedTaskControls/SharedControls/ErrorComponent/ErrorComponent";
import { Collapsible, ICollapsibleProps } from "DistributedTaskControls/SharedControls/Collapsible/Collapsible";

import { CommandButton } from "OfficeFabric/Button";
import { TooltipHost, TooltipOverflowMode } from "VSSUI/Tooltip";
import { css } from "OfficeFabric/Utilities";

import * as Utils_String from "VSS/Utils/String";
import { KeyCode } from "VSS/Utils/UI";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/Components/ScheduleItem";

export interface IScheduleProps extends Base.IProps {
    schedule: IDateTimeSchedule;
    index: number;
    isConfigureScheduleEnabled: boolean;
    toggleConfigureScheduleView: Function;
    onRemoveSchedule?: Function;
    showRemoveScheduleButton: boolean;
    isFocused?: boolean;
    showNoDaySelectedError?: boolean;
}

export class ScheduleItem extends Base.Component<IScheduleProps, Base.IStateless> {
    public componentDidMount(): void {
        this._setFocus();
    }

    public componentDidUpdate(prevProps: IScheduleProps): void {
        if (this.props && this.props.isFocused) {
            // if we have already focused it don't focus it again.
            // this check was needed because onBlur was updating component which was resulting in refocus
            if (!prevProps || prevProps.isFocused !== this.props.isFocused) {
                this._setFocus();
            }
        }
    }
    
    public render(): JSX.Element {
        const summaryText = ScheduleIntegrationUtils.getScheduleSummaryText(this.props.schedule.days,
            this.props.schedule.startHours, this.props.schedule.startMinutes);
        return (
            <div className="schedule-trigger-item" key={this.props.index}>
                <Collapsible
                    label={summaryText}
                    expanded={this.props.isConfigureScheduleEnabled}
                    headingLevel={2}
                    bowtieIconName={"bowtie-navigate-history"}
                    onRenderHeader={this._getHeader}>

                    {this.props.isConfigureScheduleEnabled ? this._getConfigureScheduleExpandedView() : null}
                    {
                        this.props.showNoDaySelectedError &&
                        <ErrorComponent
                            cssClass="schedule-trigger-error"
                            errorMessage={Resources.NoDaySelectedError} />
                    }

                </Collapsible>
            </div>
        );
    }

    private _removeSchedule(e: React.MouseEvent<HTMLButtonElement>, index: number): void {
        if (this.props.onRemoveSchedule) {
            this.props.onRemoveSchedule(index);
        }
    }

    private _getConfigureScheduleExpandedView(): JSX.Element[] {
        let returnValue: JSX.Element[] = [];
        let children: JSX.Element[] = this.props.children as JSX.Element[];
        if (children) {
            if (children instanceof Array) {
                // Children comes as array only when there are more than one child else it comes as non array object
                for (let i = 0, len = children.length; i < len; i++) {
                    returnValue.push(
                        <div className="schedule-expanded-container" key={i}>
                            {this.props.children[i]}
                        </div>);
                }
            } else {
                returnValue.push(
                    <div className="schedule-expanded-container" key={0}>
                        {this.props.children}
                    </div>);
            }
        }
        return returnValue;
    }

    private _getHeader = (props: ICollapsibleProps, defaultRender?: (props?: ICollapsibleProps) => JSX.Element | null): JSX.Element => {
        const {label} = props;
        const isExpanded: boolean = props.expanded;
        const chevronIconClass: string = Utils_String.format("chevron bowtie-icon bowtie-chevron-{0}-light", isExpanded ? "up" : "down");
        const bowtieHeader: JSX.Element = this._getBowtieHeader(props);
        const ariaLabel: string = isExpanded ? Resources.ExpandText : Resources.CollapseText;

        return (
            <div className="schedule-trigger-item-header">
                <div
                    tabIndex={0}
                    className={"schedule-summary"}
                    role={"button"}
                    onClick={this._onToggleConfigureScheduleView}
                    onKeyDown={this._handleKeyPress}
                    aria-label={Utils_String.localeFormat(Resources.ScheduleTextFormat, label)}
                    aria-expanded={isExpanded}
                    data-first-focus-element={true}
                    ref={this._resolveRef("_elementInFocus")}>

                    <div className="days-summary">
                        {bowtieHeader}
                        <TooltipHost content={label} overflowMode={TooltipOverflowMode.Parent}>
                            {label}
                        </TooltipHost>
                    </div>
                    {
                        <div className={chevronIconClass} aria-label={ariaLabel} />
                    }
                </div>
                {
                    this.props.showRemoveScheduleButton ?
                        <div className="trigger-delete">
                            <CommandButton
                                ariaLabel={Resources.DeleteScheduleButtonAriaLabel}
                                className="delete-schedule-button bowtie-icon bowtie-trash"
                                onClick={(event: React.MouseEvent<HTMLButtonElement>) => { this._removeSchedule(event, this.props.index); }} />
                        </div>
                        : null
                }
        </div>
        );
    }

    private _getBowtieHeader(props: ICollapsibleProps): JSX.Element {
        const bowtieHeaderIconClass: string = props.bowtieIconName
            ? css("schedule-trigger-item-header-icon", "bowtie-icon", props.bowtieIconName)
            : Utils_String.empty;
        return (
            props.bowtieIconName &&
            <i className={bowtieHeaderIconClass} />
        );
    }

    private _handleKeyPress = (event: React.KeyboardEvent<HTMLDivElement>): void => {
        if (event.keyCode === KeyCode.SPACE || event.keyCode === KeyCode.ENTER) {
            this._onToggleConfigureScheduleView();
            event.preventDefault();
            event.stopPropagation();
        }
    }

    private _onToggleConfigureScheduleView = (): void => {
        this._toggleConfigureScheduleView(this.props.index);
    }

    private _toggleConfigureScheduleView(index: number): void {
        this.props.toggleConfigureScheduleView(index);
    }

    private _setFocus() {
        if (this.props.isFocused && this._elementInFocus) {
            this._elementInFocus.focus();
        }
    }

    private _elementInFocus: HTMLElement;
}
