/// <reference types="react" />

import * as React from "react";

import * as ComponentBase from "DistributedTaskControls/Common/Components/Base";
import { Telemetry, Feature, Properties } from "DistributedTaskControls/Common/Telemetry";
import { IExtensionDefinitionItem } from "DistributedTaskControls/Common/Types";
import { ExternalLink } from "DistributedTaskControls/Components/ExternalLink";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { InputControlUtils } from "DistributedTaskControls/SharedControls/InputControls/Utilities";

import { PrimaryButton } from "OfficeFabric/Button";
import { Image, ImageFit } from "OfficeFabric/Image";
import { FocusZone, FocusZoneDirection } from "OfficeFabric/FocusZone";
import { css } from "OfficeFabric/Utilities";

import * as Utils_String from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!fabric";
import "VSS/LoaderPlugins/Css!DistributedTaskControls/Components/ExtensionDefinitionItem";
import { VssIcon, VssIconType } from "VSSUI/VssIcon";

export interface IExtensionDefinitionItemProps extends ComponentBase.IProps {
    task: IExtensionDefinitionItem;
    posInSet?: number;
    sizeOfSet?: number;
    onSelect?: (taskId: string) => void;
    isSelected?: boolean;
}

export class ExtensionDefinitionItem extends ComponentBase.Component<IExtensionDefinitionItemProps, ComponentBase.IStateless> {

    public componentWillMount() {
        this._extensionNameId = InputControlUtils.getId("ExtensionDefinition");
    }

    public render(): JSX.Element {

        let learnMoreComponent: JSX.Element = (
            <ExternalLink
                className={this._learnMoreButtonClassName}
                text={Resources.LearnMore}
                href={this.props.task.extensionUrl}
                onClick={this._publishExtensionLearnMoreButtonClickedTelemetry}
                newTab={true} />
        );

        return (
            <div className={css("dtc-extension-item", { "is-selected": this.props.isSelected })}
                data-is-focusable={true}
                aria-labelledby={this._extensionNameId}
                onFocus={this._onSelect}
                role={"option"}
                aria-posinset={this.props.posInSet}
                aria-setsize={this.props.sizeOfSet}
                aria-selected={this.props.isSelected}>
                <FocusZone direction={FocusZoneDirection.horizontal} isCircularNavigation={true}>
                    <div className="dtc-extension-container">
                        <div className="dtc-extension-details">
                            <Image className="dtc-extension-icon" src={this.props.task.iconUrl} imageFit={ImageFit.contain} alt={Utils_String.empty} />
                            <div className="dtc-extension-info">
                                <div className="info-name" id={this._extensionNameId}>{this.props.task.friendlyName}</div>
                                <div className="info-description">{this.props.task.description}</div>
                            </div>
                        </div>
                        <PrimaryButton
                            className={css(this._installExtensionButtonClassName, { "is-action-button-enabled": !this._isButtonDisabled() })}
                            disabled={this._isButtonDisabled()}
                            href={this.props.task.extensionUrl}
                            target={"_blank"}
                            onClick={this._publishExtensionInstallButtonClickedTelemetry}
                            ariaLabel={this.props.task.extensionStatusText}
                            ariaDescription={Utils_String.localeFormat(Resources.GetExtensionAriaDescription, this.props.task.friendlyName)}>
                            {this.props.task.extensionStatusText}
                        </PrimaryButton>
                    </div>
                    <div className="dtc-extension-footer">
                        <div className="dtc-extension-footer-left">
                            <div className="dtc-extension-author">{Utils_String.format("{0} {1}", Resources.ByText, this.props.task.author)}</div>
                            <div className="separator"></div>
                            {this._getExtensionInstallCountElement()}
                        </div>
                        {learnMoreComponent}
                    </div>
                </FocusZone>
            </div>
        );
    }

    private _getExtensionInstallCountElement(): JSX.Element {
        return (
            <div>
                <VssIcon iconName="bowtie-install" iconType={VssIconType.bowtie} />
                <span className="extension-install-count-text">{Utils_String.localeFormat(Resources.InstallCountText, this.props.task.installCount)}</span>
            </div>
        );
    }

    private _publishExtensionLearnMoreButtonClickedTelemetry = (): void => {
        let eventProperties: IDictionaryStringTo<any> = {};

        eventProperties[Properties.TaskId] = this.props.task ? this.props.task.id : Utils_String.empty;
        eventProperties[Properties.PositionInSet] = this.props.posInSet ? this.props.posInSet : Utils_String.empty;
        eventProperties[Properties.SizeOfSet] = this.props.sizeOfSet ? this.props.sizeOfSet : Utils_String.empty;

        Telemetry.instance().publishEvent(Feature.MarketplaceExtensionLearnMoreButtonClicked, eventProperties);
    }

    private _publishExtensionInstallButtonClickedTelemetry = (): void => {
        let eventProperties: IDictionaryStringTo<any> = {};

        eventProperties[Properties.TaskId] = this.props.task ? this.props.task.id : Utils_String.empty;
        eventProperties[Properties.PositionInSet] = this.props.posInSet ? this.props.posInSet : Utils_String.empty;
        eventProperties[Properties.SizeOfSet] = this.props.sizeOfSet ? this.props.sizeOfSet : Utils_String.empty;

        Telemetry.instance().publishEvent(Feature.MarketplaceExtensionInstallButtonClicked, eventProperties);
    }

    private _isButtonDisabled(): boolean {
        return (
            Utils_String.equals(this.props.task.extensionStatusText, Resources.InstalledText, true) ||
            Utils_String.equals(this.props.task.extensionStatusText, Resources.RequestedText, true)
        );
    }

    private _onSelect = (event: React.FocusEvent<HTMLElement>) => {
        let eventElement = event.nativeEvent.target as Element;
        // if add button or learn more link raise this event,
        // no need to select again since these are visible only when it is already selected
        if (this.props.onSelect && !(eventElement && eventElement.classList
            && (eventElement.classList.contains(this._installExtensionButtonClassName)
                || eventElement.classList.contains(this._learnMoreButtonClassName)))) {
            this.props.onSelect(this.props.task.id);
        }
    }

    private _installExtensionButtonClassName = "dtc-extension-install-button";
    private _learnMoreButtonClassName = "dtc-extension-learn-more-button";
    private _extensionNameId: string;
}
