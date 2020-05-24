import * as React from "react";

import { Checkbox } from "OfficeFabric/Checkbox";
import { Label } from "OfficeFabric/Label";
import { autobind } from "OfficeFabric/Utilities";

import { Component, Props, State } from "VSS/Flux/Component";

import { IInternalUpstreamSettingsState } from "Package/Scripts/Components/Settings/IFeedSettingsState";
import { MavenKeyCapitalized } from "Package/Scripts/Protocols/Maven/Constants/MavenConstants";
import { NpmKey } from "Package/Scripts/Protocols/Npm/Constants/NpmConstants";
import { NuGetKeyCapitalized } from "Package/Scripts/Protocols/NuGet/Constants/NuGetConstants";
import * as PackageResources from "Feed/Common/Resources";

import "VSS/LoaderPlugins/Css!Package:Package/Scripts/Components/Settings/AddUpstreamPanel";

export interface IAddUpstreamProtocolSelectionProps extends Props {
    /**
     * Callback to be used when the selected protocols have changed
     */
    selectedProtocolsChangedHandler: (protocols: string[]) => void;

    /**
     * Internal upstream feature availability
     */
    internalUpstreamSettings: IInternalUpstreamSettingsState;
}

export interface IAddUpstreamProtocolSelectionState extends State {
    /**
     * Dictionary informing if a particular protocol is selected
     */
    selectedProtocolsDictionary: { [protocol: string]: boolean };
}

/**
 * Panel that allows the user to specify an upstream source for addition to the feed
 */
export class AddUpstreamProtocolSelection extends Component<
    IAddUpstreamProtocolSelectionProps,
    IAddUpstreamProtocolSelectionState
> {
    constructor(props: IAddUpstreamProtocolSelectionProps) {
        super(props);

        const defaultProtocols = this._getDefaultCheckedProtocols();
        this.state = {
            selectedProtocolsDictionary: defaultProtocols
        };
    }

    public render(): JSX.Element {
        return (
            <div>
                <div className="labeled-callout">
                    <Label className="locator-label" required={true}>
                        {PackageResources.AddUpstream_ProtocolMultiselectionLabel}
                    </Label>
                </div>
                <Checkbox
                    label={NpmKey}
                    checked={this.state.selectedProtocolsDictionary[NpmKey]}
                    onChange={(ev: React.FormEvent<HTMLElement>, checked: boolean) =>
                        this._onCheckboxChange(ev, checked, NpmKey)
                    }
                />
                {this.props.internalUpstreamSettings.nugetInternalUpstreamsEnabled && (
                    <Checkbox
                        label={NuGetKeyCapitalized}
                        checked={this.state.selectedProtocolsDictionary[NuGetKeyCapitalized]}
                        onChange={(ev: React.FormEvent<HTMLElement>, checked: boolean) =>
                            this._onCheckboxChange(ev, checked, NuGetKeyCapitalized)
                        }
                    />
                )}
                {this.props.internalUpstreamSettings.mavenInternalUpstreamsEnabled && (
                    <Checkbox
                        label={MavenKeyCapitalized}
                        checked={this.state.selectedProtocolsDictionary[MavenKeyCapitalized]}
                        onChange={(ev: React.FormEvent<HTMLElement>, checked: boolean) =>
                            this._onCheckboxChange(ev, checked, MavenKeyCapitalized)
                        }
                    />
                )}
            </div>
        );
    }

    public componentDidMount(): void {
        super.componentDidMount();

        const defaultProtocols = this._getDefaultCheckedProtocols();
        const selectedProtocolsStrings: string[] = [];
        // tslint:disable-next-line:forin
        for (const protocol in defaultProtocols) {
            if (defaultProtocols[protocol] === true) {
                selectedProtocolsStrings.push(protocol);
            }
        }

        this.props.selectedProtocolsChangedHandler(selectedProtocolsStrings);
    }

    @autobind
    private _onCheckboxChange(ev: React.FormEvent<HTMLElement>, checked: boolean, protocol: string): void {
        this.setState(
            (prevState, props) => {
                prevState.selectedProtocolsDictionary[protocol] = checked;
                return { selectedProtocolsDictionary: prevState.selectedProtocolsDictionary };
            },
            () => {
                const protocols: string[] = [];
                for (const protocolKey in this.state.selectedProtocolsDictionary) {
                    if (this.state.selectedProtocolsDictionary[protocolKey] === true) {
                        protocols.push(protocolKey);
                    }
                }

                this.props.selectedProtocolsChangedHandler(protocols);
            }
        );
    }

    private _getDefaultCheckedProtocols(): { [protocol: string]: boolean } {
        const selectedProtocols: { [protocol: string]: boolean } = {};
        selectedProtocols[NpmKey] = true;
        selectedProtocols[NuGetKeyCapitalized] = this.props.internalUpstreamSettings.nugetInternalUpstreamsEnabled;
        selectedProtocols[MavenKeyCapitalized] = this.props.internalUpstreamSettings.mavenInternalUpstreamsEnabled;
        return selectedProtocols;
    }
}
