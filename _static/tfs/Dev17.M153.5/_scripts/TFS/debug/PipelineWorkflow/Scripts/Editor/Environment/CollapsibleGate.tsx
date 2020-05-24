// Copyright (c) Microsoft Corporation.  All rights reserved.

/// <reference types="react" />

import * as React from "react";

import * as ComponentBase from "DistributedTaskControls/Common/Components/Base";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";
import { ITaskItemOverviewOptions as IGateItemOverviewOptions, TaskItem as GateItem } from "DistributedTaskControls/Components/Task/TaskItem";
import { ITaskItemOverviewProps as IGateItemOverviewProps } from "DistributedTaskControls/Components/Task/TaskItemOverview";
import * as DtcResources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { Collapsible, ICollapsibleProps } from "DistributedTaskControls/SharedControls/Collapsible/Collapsible";

import { ITask as IGate } from "DistributedTasksCommon/TFS.Tasks.Types";

import { CommandButton } from "OfficeFabric/Button";
import { Image, ImageFit } from "OfficeFabric/Image";
import { Toggle } from "OfficeFabric/Toggle";
import { TooltipHost, TooltipOverflowMode } from "VSSUI/Tooltip";
import { css } from "OfficeFabric/Utilities";

import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import * as Utils_String from "VSS/Utils/String";
import { KeyCode } from "VSS/Utils/UI";
import { VssIcon, VssIconType } from "VSSUI/VssIcon";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/Editor/Environment/CollapsibleGate";

export interface ICollapsibleGateProps extends ICollapsibleProps {
    item: GateItem;
    onGateDelete?: (gateKey: string) => void;
    onGateStateChange?: (gateKey: string, enabled: boolean) => void;
}

export class CollapsibleGate extends ComponentBase.Component<ICollapsibleGateProps, ComponentBase.IStateless> {
    public render(): JSX.Element {
        const { item, cssClass, expanded, headingLevel } = this.props;
        const instance: IGate = item.getTask();
        const gateKey: string = item.getKey();
        const isExpanded: boolean = instance.enabled && expanded;

        return (
            <Collapsible
                key={gateKey}
                label={instance.displayName}
                cssClass={css("gate-collapsible-instance", cssClass, isExpanded ? Utils_String.empty : "gate-collapsed")}
                expanded={isExpanded}
                headingLevel={headingLevel}
                onRenderHeader={(props, render) => { return this._getCollapsibleHeaderComponent(item, isExpanded); }}
                bowtieIconName="bowtie-toll">
                <div className="gate-content">
                    {item.getDetails()}
                </div>
            </Collapsible>
        );
    }

    public focus(): void {
        if (this._elementInFocus) {
            this._elementInFocus.focus();
        }
    }

    private _getCollapsibleHeaderComponent(gate: GateItem, isExpanded: boolean): JSX.Element {
        const instance: IGate = gate.getTask();
        const gateKey: string = gate.getKey();
        const label: string = instance.displayName;
        const toggledExpandedState: boolean = !isExpanded;
        const imageUrl: string = this._getGateImageUrl(gate);
        const leftHeaderCss: string = css("gate-header-left-content collapsible-section-header", instance.enabled ? Utils_String.empty : "gate-disabled");
        const baseCss: string = "gate-header-left-label-icon collapsible-section-icon bowtie-icon";
        const deleteIconClass: string = "fabric-style-overrides delete-button bowtie-icon bowtie-trash filter-row-button";
        const ariaLabelId = "collapsible-gate-label-" + DtcUtils.getUniqueInstanceId();

        let iconComponent: JSX.Element = null;
        if (isExpanded || gate.isValid()) {
            iconComponent = imageUrl
                ? <Image className="gate-instance-image" src={imageUrl} imageFit={ImageFit.contain} alt={Utils_String.empty} />
                : <VssIcon className="gdmi" iconName="toll" iconType={VssIconType.bowtie} />;
        }
        else {
            iconComponent = <VssIcon className="gate-error" iconName="status-error-outline" iconType={VssIconType.bowtie} />;
        }

        return (
            <div className="gate-header">
                <div className={leftHeaderCss}
                    ref={this._resolveRef("_elementInFocus")}
                    role="button"
                    aria-disabled={!instance.enabled}
                    aria-label={label}
                    tabIndex={instance.enabled ? 0 : -1}
                    aria-expanded={isExpanded}
                    onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>) => {
                        if (event.keyCode === KeyCode.SPACE || event.keyCode === KeyCode.ENTER) {
                            this._onHeaderClick(instance.enabled, toggledExpandedState);
                            event.preventDefault();
                            event.stopPropagation();
                        }
                    }}
                    onClick={() => { this._onHeaderClick(instance.enabled, toggledExpandedState); }}>

                    {iconComponent}

                    <span className="gate-header-left-label collapsible-section-label" id={ariaLabelId}>
                        <TooltipHost content={label} overflowMode={TooltipOverflowMode.Parent}>
                            {label}
                        </TooltipHost>
                    </span>
                </div>

                <div className="gate-header-right-content">
                    <Toggle className="gate-header-right-state-toggle"
                        checked={instance.enabled}
                        onText={Resources.EnabledText}
                        offText={Resources.DisabledText}
                        onChanged={this._onGateStateChange}
                        label={Utils_String.empty}
                        aria-labelledby={ariaLabelId} />

                    <CommandButton
                        title={DtcResources.DeleteText}
                        ariaLabel={DtcResources.DeleteText}
                        className={css("gate-header-right-delete-button", deleteIconClass)}
                        onClick={this._onGateDelete} />
                </div>

            </div>);
    }

    private _getGateImageUrl(gate: GateItem): string {
        let imageUrl: string = Utils_String.empty;
        gate.getOverview({ onRenderOverview: (props: IGateItemOverviewProps) => { imageUrl = props.iconUrl; } } as IGateItemOverviewOptions);

        return imageUrl;
    }

    private _onHeaderClick(isEnabled: boolean, isExpanded: boolean): void {
        if (isEnabled && this.props.onHeaderClick) {
            this.props.onHeaderClick(isExpanded);
        }
    }

    private _onGateDelete = (): void => {
        if (this.props.onGateDelete) {
            this.props.onGateDelete(this.props.item.getKey());
        }
    }

    private _onGateStateChange = (enabled: boolean): void => {
        if (this.props.onGateStateChange) {
            this.props.onGateStateChange(this.props.item.getKey(), enabled);
        }
    }

    private _elementInFocus: HTMLElement;
}