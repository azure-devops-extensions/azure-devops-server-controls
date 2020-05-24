import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { OverlayPanelHeading } from "DistributedTaskControls/Components/OverlayPanelHeading";

import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import { ActionButton } from "OfficeFabric/Button";
import { css } from "OfficeFabric/Utilities";

import { VssIcon, VssIconType } from "VSSUI/VssIcon";
import * as Utils_String from "VSS/Utils/String";
import { Status, IStatusProps, StatusSize } from "VSSUI/Status";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/ReleaseProgress/Canvas/CustomOverlayPanelHeading";

export interface ICustomOverlayPanelHeadingProps extends Base.IProps {
    header: string;
    descriptionLabel?: string | JSX.Element;
    hideDotIcon?: boolean;
    descriptionIconProps?: IStatusProps;
    descriptionStatus?: string;
    descriptionStatusClass?: string;
    infoButtonRequired?: boolean;
    showActions?: boolean;
    actionIconName?: string;
    actionLabel?: string;
    onClick?: () => void;
}

export abstract class CustomOverlayPanelHeading extends Base.Component<ICustomOverlayPanelHeadingProps, Base.IStateless> {

    public render(): JSX.Element {
        return (
            <OverlayPanelHeading
                cssClass={this.props.cssClass}
                label={this.props.header}
                description={this._getDescription()}
                infoButtonRequired={!!this.props.infoButtonRequired || false}>
            </OverlayPanelHeading>
        );
    }

    private _getDescription(): JSX.Element {
        const isStageNotDeployed = Utils_String.equals(this.props.descriptionStatus, Resources.OverallApprovalsNotDeployed);

        return (<span className="customized-overlay-panel-description">
                    {
                        this.props.descriptionLabel && 
                            <span className={"description-label"}>
                                { this.props.descriptionLabel }
                            </span>
                    }
                    { !isStageNotDeployed && !this.props.hideDotIcon && <VssIcon iconName={"bowtie-dot"} iconType={VssIconType.bowtie} className={"description-dotted-icon"}/> }
                    {
                        !isStageNotDeployed && this.props.descriptionIconProps &&
                            <Status {...this.props.descriptionIconProps} className="description-status-icon" size={StatusSize.s}/>
                    }
                    {
                        !isStageNotDeployed && this.props.descriptionStatus &&
                            <span className={this.props.descriptionStatusClass}>
                                { this.props.descriptionStatus }
                            </span>
                    } 
                    {
                        this.props.showActions && 
                        <div>
                            <span className="vertical-line"></span>
                            <ActionButton
                                className={"description-action-button"}
                                iconProps={ { iconName: this.props.actionIconName}  }
                                onClick={this.props.onClick}
                                ariaLabel={this.props.actionLabel} >
                                { this.props.actionLabel }
                            </ActionButton>
                        </div>
                    }
                </span>);
    }
}