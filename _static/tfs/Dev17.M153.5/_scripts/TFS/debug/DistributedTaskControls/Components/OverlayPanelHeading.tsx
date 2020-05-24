/// <reference types="react" />

import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import * as ComponentBase from "DistributedTaskControls/Common/Components/Base";
import { Component as InfoButton } from "DistributedTaskControls/Components/InfoButton";
import { ICalloutContentProps } from "DistributedTaskControls/Components/CalloutComponent";
import { SafeLink } from "DistributedTaskControls/Components/SafeLink";
import { TooltipIfOverflow } from "DistributedTaskControls/Components/TooltipIfOverflow";

import { Label } from "OfficeFabric/Label";

import { css } from "OfficeFabric/Utilities";

import { VssIcon, VssIconType } from "VSSUI/VssIcon";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/Components/OverlayPanelHeading";

export interface IOverlayPanelHeadingProps extends ComponentBase.IProps {
    label: string;
    infoButtonRequired?: boolean;
    infoButtonCallOut?: string;
    description?: string | JSX.Element;
    descriptionIcon?: string;
    descriptionIconClass?: string;
    descriptionIconType?: VssIconType;
    linkedUrl?: string;
    labelId?: string;
    subHeader?: string;
}

export class OverlayPanelHeading extends Base.Component<IOverlayPanelHeadingProps, Base.IStateless> {

    public render(): JSX.Element {
        return (
            <div className={css("overlay-panel-heading-row", this.props.cssClass)} role="heading" aria-level={2}>
                <div className="left-section">
                    <Label id={this.props.labelId} className="overlay-panel-heading-label">
                        {this.props.label}
                    </Label>
                    {this.props.subHeader && this._getSubHeader()}
                    {
                        this.props.infoButtonRequired &&
                        < InfoButton cssClass="overlay-panel-heading-info"
                            calloutContent={{
                                calloutDescription: this.props.infoButtonCallOut
                            } as ICalloutContentProps} />
                    }
                    {this.props.description && this._getDescriptionElement()}
                </div>
            </div>
        ) as JSX.Element;
    }

    private _getSubHeader(): JSX.Element {
        return (
            <span className="subHeaderContainer">
                <span className="vertical-line"></span>
                <span className="subheader-style">{this.props.subHeader}</span>
            </span>
        );
    }

    private _getDescriptionElement(): JSX.Element {
        if (this.props.linkedUrl) {
            return (<div className="description-container overlay-panel-heading-link-container">
                <SafeLink href={this.props.linkedUrl}
                    target="_blank">
                    {this.props.description}
                </SafeLink>
            </div>);
        }
        else {
            let descriptionIcon: JSX.Element = null;
            if (this.props.descriptionIcon) {
                let iconType: VssIconType = VssIconType.fabric;
                if (this.props.descriptionIconType) {
                    iconType = this.props.descriptionIconType;
                }
                descriptionIcon = (<VssIcon className={css("description-icon", this.props.descriptionIconClass)} iconName={this.props.descriptionIcon} iconType={iconType} />);
            }
            
            const descriptionContentClassName = "description-content";
            let descriptionContent = this._getDescriptionContent(descriptionContentClassName);

            return (
                <div className="description-container">
                    {descriptionIcon}
                    {
                        typeof this.props.description === "string" 
                        ? this._getContentWithTooltip(descriptionContent, descriptionContentClassName)
                        : descriptionContent
                    }
                </div>
            );


        }
    }

    private _getDescriptionContent(className: string): JSX.Element {
        return (
            <div className={className}>
                {this.props.description}
            </div>
        );
    }

    private _getContentWithTooltip(content: JSX.Element, className: string): JSX.Element {
        return (
            <TooltipIfOverflow tooltip={this.props.description.toString()} targetElementClassName={className} containerClassName="tooltip-container-class">
                <div className="tooltip-container-class">
                    {content}
                </div>
            </TooltipIfOverflow>
        );
    }
}
