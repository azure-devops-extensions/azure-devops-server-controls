import * as React from "react";

import { CompoundButton } from "OfficeFabric/Button";
import { Label } from "OfficeFabric/Label";

import { Component, Props, State } from "VSS/Flux/Component";
import * as Utils_String from "VSS/Utils/String";

import { AddUpstreamPanelStage } from "Package/Scripts/Components/Settings/CommonTypes";
import { IInternalUpstreamSettingsState } from "Package/Scripts/Components/Settings/IFeedSettingsState";

import "VSS/LoaderPlugins/Css!Package:Package/Scripts/Components/Settings/AddUpstreamPanel";

import * as PackageResources from "Feed/Common/Resources";

export interface IUpstreamTypeSelectionPanelSectionProps extends Props {
    /**
     * Flag which informs whether there are available public source to configure
     */
    hasAvailablePublicUpstreamSources: boolean;

    /**
     * Flag which informs whether there are available feeds to configure as upstreams
     */
    hasAvailableFeeds: boolean;

    /**
     * Callback to be used when the user has selected a type of upstream to configure
     */
    onStageChangedHandler: (stage: AddUpstreamPanelStage) => void;

    /**
     * Internal upstream feature availability
     */
    internalUpstreamSettings: IInternalUpstreamSettingsState;
}

/**
 * Panel section that allows the user select the type of upstream to add
 */
export class UpstreamTypeSelectionPanelSection extends Component<IUpstreamTypeSelectionPanelSectionProps, State> {
    public render(): JSX.Element {
        const showCollectionButton =
            this.props.internalUpstreamSettings.isV2Feed &&
            this.props.internalUpstreamSettings.collectionUpstreamsEnabled &&
            !this.props.internalUpstreamSettings.organizationUpstreamsEnabled;
        const showOrganizationButton =
            this.props.internalUpstreamSettings.isV2Feed &&
            this.props.internalUpstreamSettings.organizationUpstreamsEnabled;
        return (
            <div>
                <Label className="upstream-type-selection-description">
                    {Utils_String.format(
                        PackageResources.AddUpstreamPanel_Description,
                        PackageResources.AzureArtifacts
                    )}
                </Label>
                <div className="upstream-panel-element">
                    <CompoundButton
                        className="upstream-type-button"
                        description={PackageResources.AddUpstreamPanel_PublicUpstreamButton_Description}
                        onClick={() => {
                            this.props.onStageChangedHandler(AddUpstreamPanelStage.PublicUpstream);
                        }}
                        disabled={!this.props.hasAvailablePublicUpstreamSources}
                    >
                        {PackageResources.AddUpstreamPanel_PublicUpstreamButton_Title}
                    </CompoundButton>
                </div>
                {showOrganizationButton && (
                    <div className="upstream-panel-element">
                        <CompoundButton
                            className="upstream-type-button"
                            description={Utils_String.format(
                                PackageResources.AddUpstreamPanel_FeedButton_Description,
                                PackageResources.AzureArtifacts
                            )}
                            onClick={() => {
                                this.props.onStageChangedHandler(AddUpstreamPanelStage.OrganizationUpstream);
                            }}
                        >
                            {Utils_String.format(
                                PackageResources.AddUpstreamPanel_FeedButton_Title,
                                PackageResources.AzureArtifacts
                            )}
                        </CompoundButton>
                    </div>
                )}
                {showCollectionButton && (
                    <div className="upstream-panel-element">
                        <CompoundButton
                            className="upstream-type-button"
                            description={Utils_String.format(
                                PackageResources.AddUpstreamPanel_FeedButton_Description,
                                PackageResources.AzureArtifacts
                            )}
                            disabled={!this.props.hasAvailableFeeds}
                            onClick={() => {
                                this.props.onStageChangedHandler(AddUpstreamPanelStage.FinalStageUpstream);
                            }}
                        >
                            {Utils_String.format(
                                PackageResources.AddUpstreamPanel_FeedButton_Title,
                                PackageResources.AzureArtifacts
                            )}
                        </CompoundButton>
                    </div>
                )}
            </div>
        );
    }
}
