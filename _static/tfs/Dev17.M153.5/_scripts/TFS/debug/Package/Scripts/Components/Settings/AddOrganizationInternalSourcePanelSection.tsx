import * as React from "react";

import { ITextField, TextField } from "OfficeFabric/TextField";
import { autobind } from "OfficeFabric/Utilities";

import { Component, Props, State } from "VSS/Flux/Component";
import * as Utils_String from "VSS/Utils/String";
import { Uri } from "VSS/Utils/Url";

import { FeedSettingsActionCreator } from "Package/Scripts/Actions/FeedSettingsActionCreator";
import { AddUpstreamProtocolSelection } from "Package/Scripts/Components/Settings/AddUpstreamProtocolSelection";
import { UpstreamConstants } from "Package/Scripts/Components/Settings/CommonTypes";
import { IInternalUpstreamSettingsState } from "Package/Scripts/Components/Settings/IFeedSettingsState";
import { UpstreamSource, UpstreamSourceType } from "Package/Scripts/WebApi/VSS.Feed.Contracts";

import "VSS/LoaderPlugins/Css!Package:Package/Scripts/Components/Settings/AddUpstreamPanel";

import * as PackageResources from "Feed/Common/Resources";

export interface IAddInternalSourcePanelSectionProps extends Props {
    /**
     * Callback to be used when a set of upstream sources have been selected
     */
    selectedUpstreamSourcesHandler: (sources: UpstreamSource[]) => void;

    /**
     * Error message to display on upstream source name field
     */
    upstreamSourceNameInvalidMessage?: string;

    /**
     * Internal upstream feature availability
     */
    internalUpstreamSettings: IInternalUpstreamSettingsState;
}

export interface IAddInternalSourcePanelSectionState extends State {
    /**
     * Feed locator
     */
    currentLocator: string;

    /**
     * The name of the upstream
     */
    upstreamName: string;

    /**
     * Whether the locator is valid or not
     */
    isLocatorValid: boolean;

    /**
     * List of selected protocols
     */
    selectedProtocols: string[];
}

/**
 * Panel that allows the user to specify an upstream source for addition to the feed
 */
export class AddOrganizationInternalSourcePanelSection extends Component<
    IAddInternalSourcePanelSectionProps,
    IAddInternalSourcePanelSectionState
> {
    private _isUpstreamNameDirty: boolean = false;
    private _locatorTextField: ITextField = null;

    constructor(props: IAddInternalSourcePanelSectionProps) {
        super(props);

        this.state = {
            currentLocator: null,
            upstreamName: "",
            isLocatorValid: false,
            selectedProtocols: []
        };
    }

    public render(): JSX.Element {
        return (
            <div>
                <div className="upstream-panel-element">
                    <TextField
                        label={Utils_String.format(
                            PackageResources.AddUpstream_LocatorTextFieldLabel,
                            PackageResources.AzureArtifacts
                        )}
                        placeholder={PackageResources.AddUpstream_FeedLocatorTextField_Placeholder}
                        required={true}
                        onGetErrorMessage={this._getErrorMessage}
                        validateOnLoad={false}
                        onChanged={this._onLocatorChanged}
                        ref={(element: ITextField) => (this._locatorTextField = element)}
                    />
                </div>
                <div className="upstream-panel-element">
                    <AddUpstreamProtocolSelection
                        selectedProtocolsChangedHandler={this.selectedProtocolsChangedHandler}
                        internalUpstreamSettings={this.props.internalUpstreamSettings}
                    />
                </div>
                <div className="upstream-panel-element">
                    <TextField
                        label={PackageResources.AddUpstream_UpstreamNameTextFieldLabel}
                        onChanged={this._onUpstreamNameChanged}
                        value={this.state.upstreamName}
                        disabled={!this.state.isLocatorValid || this.state.currentLocator == null}
                        required={true}
                        maxLength={UpstreamConstants.MaxUpstreamNameLength}
                        errorMessage={this.props.upstreamSourceNameInvalidMessage}
                    />
                </div>
            </div>
        );
    }

    public componentDidMount(): void {
        super.componentDidMount();

        this.setFocus();
    }

    @autobind
    private _onLocatorChanged(newValue: string): void {
        // Setting location is valid to false to wait until validation kicks in
        this.setState(
            {
                isLocatorValid: false
            },
            this._updateUpstreamSources
        );
    }

    private _setErrorStateOnLocatorChanged(): void {
        const name: string = this._isUpstreamNameDirty ? this.state.upstreamName : "";
        this.setState(
            {
                upstreamName: name,
                isLocatorValid: false
            },
            this._updateUpstreamSources
        );
    }

    @autobind
    private _onUpstreamNameChanged(newValue: string): void {
        FeedSettingsActionCreator.changeUpstreamSourceName.invoke(newValue);

        this._isUpstreamNameDirty = true;

        this.setState({ upstreamName: newValue }, this._updateUpstreamSources);
    }

    private _getUpstreamName(host: string, feed: string, view: string): string {
        if (this._isUpstreamNameDirty) {
            return this.state.upstreamName;
        }

        if (!host || !feed || !view) {
            return "";
        }

        const currentLength = host.length + feed.length + view.length;
        const maxLength = UpstreamConstants.MaxUpstreamNameLength - 2;
        if (currentLength > maxLength) {
            const sectionLength = maxLength / 3;
            host = host.substring(0, sectionLength);
            feed = feed.substring(0, sectionLength);
            view = view.substring(0, sectionLength);
        }

        return `${host}-${feed}@${view}`;
    }

    private _updateUpstreamSources(): void {
        this.props.selectedUpstreamSourcesHandler(this._getUpstreamSources());
    }

    private _getUpstreamSources(): UpstreamSource[] {
        if (
            this.state.currentLocator != null &&
            this.state.upstreamName != null &&
            this.state.upstreamName.length > 0 &&
            this.state.isLocatorValid
        ) {
            const upstreamSources: UpstreamSource[] = [];
            for (const protocol of this.state.selectedProtocols) {
                upstreamSources.push({
                    id: null,
                    name: this.state.upstreamName,
                    location: this.state.currentLocator,
                    protocol,
                    upstreamSourceType: UpstreamSourceType.Internal,
                    deletedDate: null,
                    internalUpstreamCollectionId: null,
                    internalUpstreamFeedId: null,
                    internalUpstreamViewId: null
                } as UpstreamSource);
            }

            return upstreamSources.length > 0 ? upstreamSources : null;
        }

        return null;
    }

    @autobind
    private selectedProtocolsChangedHandler(protocols: string[]): void {
        this.setState({ selectedProtocols: protocols }, this._updateUpstreamSources);
    }

    @autobind
    private _getErrorMessage(newValue: string): string {
        if (newValue.length === 0) {
            this.setState(
                {
                    isLocatorValid: false,
                    upstreamName: this._getUpstreamName(null, null, null),
                    currentLocator: null
                },
                this._updateUpstreamSources
            );
            return Utils_String.empty;
        }

        const uri = Uri.parse(newValue);

        if (!uri) {
            this._setErrorStateOnLocatorChanged();
            return PackageResources.AddUpstream_LocatorTextField_Error_FormatCouldNotBeParsed;
        }

        if (uri.scheme.length === 0 || uri.scheme.toLowerCase() !== "vsts-feed".toLowerCase()) {
            this._setErrorStateOnLocatorChanged();
            return PackageResources.AddUpstream_LocatorTextField_Error_IncorrectScheme;
        }

        const path = uri.path;

        if (!path || path.length === 0) {
            this._setErrorStateOnLocatorChanged();
            return PackageResources.AddUpstream_LocatorTextField_Error_NoFeedProvided;
        }

        if (path.indexOf("@") < 0) {
            this._setErrorStateOnLocatorChanged();
            return PackageResources.AddUpstream_LocatorTextField_Error_NoViewProvided;
        }

        const matches = path.match(/\/*(.+)@([^\/]+)\/*(.*)/i);

        if (!matches) {
            this._setErrorStateOnLocatorChanged();
            return PackageResources.AddUpstream_LocatorTextField_Error_FormatCouldNotBeParsed;
        }

        // The regex above would capture in the fourth group the section between stars: vsts-feed://foo/bar@bar/**this/would/be/captured/by/the/fourth/group/**
        const indexOfSecondSegmentInPath = 3;
        if (matches[indexOfSecondSegmentInPath].length > 0) {
            this._setErrorStateOnLocatorChanged();
            return PackageResources.AddUpstream_LocatorTextField_Error_LocatorContainsMoreThanOneSegmentAfterHost;
        }

        const indexOfFeed = 1;
        const indexOfView = 2;
        this.setState(
            {
                isLocatorValid: true,
                upstreamName: this._getUpstreamName(uri.host, matches[indexOfFeed], matches[indexOfView]),
                currentLocator: newValue
            },
            this._updateUpstreamSources
        );

        return Utils_String.empty;
    }

    private setFocus(): void {
        if (this._locatorTextField) {
            this._locatorTextField.focus();
        }
    }
}
