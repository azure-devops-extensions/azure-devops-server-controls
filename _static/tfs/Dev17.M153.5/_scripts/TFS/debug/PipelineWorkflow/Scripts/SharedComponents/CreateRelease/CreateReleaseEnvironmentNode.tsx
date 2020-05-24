/// <reference types="react" />

import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";

import { CreateReleaseEnvironmentNodeConstants } from "PipelineWorkflow/Scripts/SharedComponents/CreateRelease/Constants";

import { DirectionalHint } from "OfficeFabric/ContextualMenu";
import { TooltipDelay, TooltipHost } from "VSSUI/Tooltip";
import { css } from "OfficeFabric/Utilities";

import * as Utils_String from "VSS/Utils/String";
import { KeyCode } from "VSS/Utils/UI";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/SharedComponents/CreateRelease/CreateReleaseEnvironmentNode";

export interface ICreateReleaseEnvironmentNodeProps extends Base.IProps {
    environmentName: string;
    environmentId: number;
    onEnvironmentNodeClick: (environmentId: number) => void;
    corePropertiesWidth?: number;
    nodeHeight?: number;
    nodeWidth?: number;
    ariaLabel?: string;
    isDisabled?: boolean;
    environmentDescription?: string;
    environmentWarning?: string;
    borderCssClass?: string;
    bowtieIcon?: string;
}

export class CreateReleaseEnvironmentNode extends Base.Component<ICreateReleaseEnvironmentNodeProps, Base.IStateless> {

    public render(): JSX.Element {

        return (
            <TooltipHost
                directionalHint={DirectionalHint.topCenter}
                tooltipProps={{ onRenderContent: this._renderTooltipContent }}
                delay={TooltipDelay.medium}>
                {this._getNodeContent()}
            </TooltipHost>);

    }

    private _getNodeContent(): JSX.Element {
        const style = {
            height: this.props.nodeHeight || CreateReleaseEnvironmentNodeConstants.compactEnvironmentNodeHeight,
            width: this.props.nodeWidth || CreateReleaseEnvironmentNodeConstants.compactEnvironmentNodeWidth
        };

        const containerClassName = css(this.props.cssClass, "compact-environment-node");
        const ariaLabel = this.props.ariaLabel || this.props.environmentName;
        const key = this.props.environmentId.toString();
        const describedByDivId = "node-description" + DtcUtils.getUniqueInstanceId();
        const description = Utils_String.localeFormat("{0} {1}", this.props.environmentDescription, this.props.environmentWarning);

        return <div className={containerClassName}
            key={key}
            aria-disabled={this.props.isDisabled}
            data-is-grid-focusable={true}
            onKeyDown={this._handleKeyDown}
            aria-label={ariaLabel}
            onClick={this._onNodeClick}
            aria-describedby={describedByDivId}>
            <div className="hidden" id={describedByDivId}>{description}</div>
            <div className={css("node-content", "dtc-canvas-element-border", this.props.borderCssClass)} style={style} >
                <div className={css("environment-node-icon", "bowtie-icon", this._isWarningPresent() ? "bowtie-status-warning" : this.props.bowtieIcon)} />
                <div ref={this._resolveRef("_environmentNameContainer")} className="node-environment-name">{this.props.environmentName}</div>
                {this._isEnvironmentNameOverflow() && <span className="text-fadeout"></span>}
            </div>
        </div>;
    }



    private _renderTooltipContent = (): JSX.Element => {
        return <div className="compact-environment-node-tooltip">
            {
                <div className="node-tooltip-section tooltip-environment-name-container">
                    <span className="tooltip-environment-name">{this.props.environmentName}</span>
                </div>
            }
            {
                <div className="node-tooltip-section tooltip-environment-description-container">
                    <span className={css("tooltip-icon", "bowtie-icon", this.props.bowtieIcon)} />
                    <span className="tooltip-environment-description">{this.props.environmentDescription}</span>
                </div>
            }
            {
                this._isWarningPresent() &&
                <div className="node-tooltip-section tooltip-environment-warning-container">
                    <span className={css("tooltip-icon", "bowtie-icon", "bowtie-status-warning")} />
                    <span className="tooltip-environment-warning">{this.props.environmentWarning}</span>
                </div>
            }
        </div>;
    }

    private _isEnvironmentNameOverflow(): boolean {
        if (this._environmentNameContainer &&
            this._environmentNameContainer.offsetWidth < this._environmentNameContainer.scrollWidth) {
            return true;
        }
        return false;
    }

    private _isWarningPresent(): boolean {
        return !!this.props.environmentWarning;
    }

    private _onNodeClick = () => {
        if (this.props.onEnvironmentNodeClick) {
            this.props.onEnvironmentNodeClick(this.props.environmentId);
        }
    }

    private _handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.keyCode === KeyCode.ENTER || e.keyCode === KeyCode.SPACE) {
            this._onNodeClick();
            e.preventDefault();
            e.stopPropagation();
        }
    }

    private _environmentNameContainer: HTMLDivElement;

}
