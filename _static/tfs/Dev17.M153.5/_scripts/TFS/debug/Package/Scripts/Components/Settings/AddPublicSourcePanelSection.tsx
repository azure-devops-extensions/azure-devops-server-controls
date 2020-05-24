import * as React from "react";

import { Dropdown, IDropdownOption } from "OfficeFabric/Dropdown";
import { TextField } from "OfficeFabric/TextField";
import { Async, autobind } from "OfficeFabric/Utilities";

import { Component, Props, State } from "VSS/Flux/Component";
import * as Utils_String from "VSS/Utils/String";

import { FeedSettingsActionCreator } from "Package/Scripts/Actions/FeedSettingsActionCreator";
import { UpstreamConstants } from "Package/Scripts/Components/Settings/CommonTypes";
import { NpmKey } from "Package/Scripts/Protocols/Npm/Constants/NpmConstants";
import * as PackageResources from "Feed/Common/Resources";
import { ExtendedUpstreamSource } from "Package/Scripts/WebApi/VSS.CustomFeed.Contracts";

import "VSS/LoaderPlugins/Css!Package:Package/Scripts/Components/Settings/AddUpstreamPanel";

export interface IAddPublicSourcePanelSectionProps extends Props {
    /**
     * UpstreamSources the user can select from a dropdown
     */
    availablePublicUpstreamSources: ExtendedUpstreamSource[];

    /**
     * Error message to display on upstream source name field
     */
    upstreamSourceNameInvalidMessage?: string;

    /**
     * Error message to display on upstream source location field
     */
    upstreamSourceLocationInvalidMessage?: string;

    /**
     * Callback to be used when a set of upstream sources have been selected
     */
    selectedUpstreamSourcesHandler: (sources: ExtendedUpstreamSource[]) => void;

    /**
     * Feature flag for custom upstream sources
     */
    isCustomPublicUpstreamsFeatureEnabled: boolean;
}

export interface IAddPublicSourcePanelSectionState extends State {
    /**
     * The name of the upstream
     */
    upstreamName: string;

    /**
     * The protocol of the upstream
     */
    upstreamProtocolKey: string;

    /**
     * The upstream root url
     */
    upstreamLocation: string;

    /**
     * Key of the selected upstream choice from the dropdown
     */
    selectedUpstreamKey: string;
}

/**
 * Panel that allows the user to specify an upstream source for addition to the feed
 */
export class AddPublicSourcePanelSection extends Component<
    IAddPublicSourcePanelSectionProps,
    IAddPublicSourcePanelSectionState
> {
    private _upstreamSourceToSave: ExtendedUpstreamSource = null;
    private _dropdown: Dropdown = null;

    constructor(props: IAddPublicSourcePanelSectionProps) {
        super(props);

        this.state = {
            upstreamName: Utils_String.empty,
            upstreamProtocolKey: NpmKey,
            upstreamLocation: Utils_String.empty,
            selectedUpstreamKey: Utils_String.empty
        };

        this._async = new Async();
    }

    public render(): JSX.Element {
        const publicOptions = this._publicDropDownOptions(this.props.availablePublicUpstreamSources);
        const protocolOptions = [{ key: NpmKey, text: NpmKey }];

        return !this.props.isCustomPublicUpstreamsFeatureEnabled &&
            this.props.availablePublicUpstreamSources.length === 0 ? (
            <div>{PackageResources.AddUpstreamPanel_NoPublicSources}</div>
        ) : (
            <div className={"add-upstream-panel-body"}>
                <Dropdown
                    label={PackageResources.UpstreamSourceType_Public}
                    className={"add-upstream-panel-element"}
                    placeHolder={PackageResources.AddUpstreamPanel_SourceDropdownPlaceholder}
                    onChanged={this._onSelectedSourceChanged}
                    options={publicOptions}
                    ref={(element: Dropdown) => (this._dropdown = element)}
                    required={true}
                    aria-required={true}
                />
                {this.props.isCustomPublicUpstreamsFeatureEnabled ? (
                    <div hidden={this.state.selectedUpstreamKey !== PackageResources.AddUpstreamPanel_Custom}>
                        <TextField
                            className={"add-upstream-panel-element"}
                            label={PackageResources.AddUpstreamPanel_UpstreamLocationLabel}
                            errorMessage={this.props.upstreamSourceLocationInvalidMessage}
                            value={this.state.upstreamLocation}
                            required={true}
                            // debouncing location input to delay validation between keystrokes
                            onChanged={this._async.debounce(this._onUpstreamLocationChanged, 200)}
                            onGetErrorMessage={this._onUpstreamLocationChanged}
                            validateOnFocusOut={true}
                            validateOnLoad={false}
                        />
                        <Dropdown
                            className={"add-upstream-panel-element"}
                            label={PackageResources.AddUpstreamPanel_UpstreamProtocolLabel}
                            placeHolder={PackageResources.AddUpstreamPanel_ProtocolDropdownPlaceholder}
                            selectedKey={this.state.upstreamProtocolKey}
                            onChanged={this._onSelectedProtocolChanged}
                            options={protocolOptions}
                            required={true}
                            aria-required={true}
                        />
                    </div>
                ) : null}
                <TextField
                    className={"add-upstream-panel-element"}
                    label={PackageResources.AddUpstreamPanel_UpstreamNameLabel}
                    value={this.state.upstreamName}
                    errorMessage={this.props.upstreamSourceNameInvalidMessage}
                    maxLength={UpstreamConstants.MaxUpstreamNameLength}
                    required={true}
                    // debouncing location input to delay validation between keystrokes
                    onChanged={this._async.debounce(this._onUpstreamNameChanged, 200)}
                    onGetErrorMessage={this._onUpstreamNameChanged}
                    validateOnFocusOut={true}
                    validateOnLoad={false}
                />
            </div>
        );
    }

    // All upstream source panel sections execute this to set focus to itself
    // so this could be refactored into a common base class in the future
    public componentDidMount(): void {
        super.componentDidMount();

        this.setFocus();
    }

    public componentWillUnmount(): void {
        super.componentWillUnmount();

        // cancel all async ops still running
        this._async.dispose();
    }

    @autobind
    private _onSelectedSourceChanged(item: IDropdownOption): void {
        if (item.data == null) {
            return;
        }

        // only change state if upstream source has changed
        if (this.state.selectedUpstreamKey !== (item.key as string)) {
            // leave name blank if custom upstream
            const newUpstreamName =
                (item.key as string) !== PackageResources.AddUpstreamPanel_Custom ? (item.key as string) : "";

            this._upstreamSourceToSave = this._getUpstreamSourceCopy(item.data);

            this.setState({
                upstreamName: newUpstreamName
            });

            // remove error message when resetting name
            // don't signal an error message if we switched to Custom and the error message wasn't set in the first place
            if (this.props.upstreamSourceNameInvalidMessage !== "" || newUpstreamName !== "") {
                FeedSettingsActionCreator.changeUpstreamSourceName.invoke(newUpstreamName);
            }

            this._upstreamSourceToSave.name = newUpstreamName;
            this.props.selectedUpstreamSourcesHandler([this._upstreamSourceToSave]);

            this.setState({
                selectedUpstreamKey: item.key as string
            });
        }
    }

    @autobind
    private _onSelectedProtocolChanged(item: IDropdownOption): void {
        if (item.key == null) {
            return;
        }

        this.setState({ upstreamProtocolKey: item.key as string }, () => {
            if (this._upstreamSourceToSave != null) {
                this._upstreamSourceToSave.protocol = item.key as string;
                this.props.selectedUpstreamSourcesHandler([this._upstreamSourceToSave]);
            }
        });
    }

    /**
     * This is triggered by focusing out of the the upstream name field
     */
    @autobind
    private _onUpstreamNameChanged(newValue: string): string {
        FeedSettingsActionCreator.changeUpstreamSourceName.invoke(newValue);

        this.setState({ upstreamName: newValue }, () => {
            if (this._upstreamSourceToSave != null) {
                this._upstreamSourceToSave.name = newValue;
                this.props.selectedUpstreamSourcesHandler([this._upstreamSourceToSave]);
            }
        });

        // Return an empty string because the error will be evaluated in the action handler and returned as props
        return Utils_String.empty;
    }

    /**
     * This is triggered by focusing out of the the upstream location url field
     */
    @autobind
    private _onUpstreamLocationChanged(newValue: string): string {
        // validate url
        FeedSettingsActionCreator.changeUpstreamSourceLocation.invoke(newValue);

        this.setState({ upstreamLocation: newValue }, () => {
            if (this._upstreamSourceToSave != null) {
                this._upstreamSourceToSave.location = newValue;
                this.props.selectedUpstreamSourcesHandler([this._upstreamSourceToSave]);
            }
        });

        // Return an empty string because the error will be evaluated in the action handler and returned as props
        return Utils_String.empty;
    }

    private _getUpstreamSourceCopy(source: ExtendedUpstreamSource): ExtendedUpstreamSource {
        return {
            id: source.id,
            name: this.state.upstreamName,
            location: source.location,
            protocol: source.protocol,
            upstreamSourceType: source.upstreamSourceType,
            deletedDate: null,
            internalUpstreamCollectionId: null,
            internalUpstreamFeedId: null,
            internalUpstreamViewId: null,
            isCustom: source.isCustom
        } as ExtendedUpstreamSource;
    }

    private _publicDropDownOptions(upstreamSources: ExtendedUpstreamSource[]): IDropdownOption[] {
        const publicOptions = upstreamSources.map(upstreamSource => {
            return {
                key: upstreamSource.name,
                text: upstreamSource.location
                    ? Utils_String.format("{0} ({1})", upstreamSource.name, upstreamSource.location)
                    : upstreamSource.name,
                data: upstreamSource
            } as IDropdownOption;
        });
        return publicOptions;
    }

    private setFocus(): void {
        if (this._dropdown) {
            this._dropdown.focus();
        }
    }

    private _async: Async;
}
