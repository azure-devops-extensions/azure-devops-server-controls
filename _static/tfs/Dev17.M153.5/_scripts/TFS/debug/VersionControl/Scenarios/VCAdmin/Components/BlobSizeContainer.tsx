/// Copyright (c) Microsoft Corporation. All rights reserved.

import * as React from "react";
import * as ReactDOM from "react-dom";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import "VSS/LoaderPlugins/Css!VersionControl/VCAdmin";
import { VCAdminStoresHub } from "VersionControl/Scenarios/VCAdmin/Stores/VCAdminStoresHub"
import { VCAdminActionCreator } from "VersionControl/Scenarios/VCAdmin/VCAdminActionCreator"
import { PolicyStore } from "VersionControl/Scenarios/VCAdmin/Stores/PolicyStore";
import { PolicyConfiguration } from "Policy/Scripts/Generated/TFS.Policy.Contracts";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import * as VCTypes from "VersionControl/Scenarios/VCAdmin/VCAdminTypes"
import { Toggle } from "OfficeFabric/Toggle";
import { Label } from "OfficeFabric/Label";
import { Dropdown, IDropdown, IDropdownOption } from "OfficeFabric/Dropdown"
import * as String from "VSS/Utils/String";

export class BlobSizeContainerProps {
    public actionCreator: VCAdminActionCreator;
    public blobSizeStore: PolicyStore;
    public repoContext: RepositoryContext;
    public canEditPolicies: boolean;
}

export class BlobSizeContainerState extends VCTypes.PolicyContainerState {
    public options: IDropdownOption[];
    public selectedKey: number;
    public existingSizeInMB: number;
}

export class BlobSizeContainer extends React.Component<BlobSizeContainerProps, BlobSizeContainerState> {
    // sizes to have in dropdown: 1MB, 2MB, 5MB, 10MB, 100MB, 200MB, and no limit
    private static defaultOptions: IDropdownOption[] = [
        { key: -1, text: VCResources.Unlimited },
        { key: 1, text: "1 " + VCResources.MB },
        { key: 2, text: "2 " + VCResources.MB },
        { key: 5, text: "5 " + VCResources.MB },
        { key: 10, text: "10 " + VCResources.MB },
        { key: 100, text: "100 " + VCResources.MB },
        { key: 200, text: "200 " + VCResources.MB },
    ];

    constructor(props: BlobSizeContainerProps) {
        super(props);
        this.state = {
            ...props.blobSizeStore.getData(),
            options: BlobSizeContainer.defaultOptions,
            selectedKey: -1,
            existingSizeInMB: null
        };

        this.props.actionCreator.getBlobSizeSetting();
    }

    public componentWillMount() {
        this.props.blobSizeStore.addChangedListener(this._onStoreChanged);
    }

    public componentWillUnmount() {
        this.props.blobSizeStore.removeChangedListener(this._onStoreChanged);
    }

    public render(): JSX.Element {
        if (!this.state.initialized) {
            return null;
        }

        // if we have a policy config record, use the value from there.  If not, default to false
        const checked: boolean = this.state.localPolicy
            ? this.state.localPolicy.isEnabled
            : false;

        const disabled = !!this.state.error || !this.props.canEditPolicies;

        return (
            <div className={VCTypes.Css.OptionGroup}>
                <h3 className={VCTypes.Css.OptionHeader}>{VCResources.GitBlobSizeTitle}</h3>
                <Label>{VCResources.GitBlobSizeDescription}</Label>
                <Dropdown
                    className={VCTypes.Css.InputContainer}
                    options={this.state.options}
                    onChanged={this._onDropdownChanged}
                    selectedKey={this.state.selectedKey}
                    ariaLabel={VCResources.GitBlobSizeTitle}
                    disabled={disabled}
                />
                {
                    this.state.error &&
                        <div aria-live="assertive" className={VCTypes.Css.Error}>{VCResources.GitSettingError} {this.state.error.message}</div>
                }

                {this.state.policyInherited &&
                    <div className={VCTypes.Css.OptionInherited}>
                        {String.format(
                            VCResources.GitBlobSizeOverrideFormat,
                            Math.floor(VCTypes.Utils.bytesToMB(this.state.projectPolicy.settings.maximumGitBlobSizeInBytes)))}
                    </div>
                }
            </div>
        );
    }

    private _onStoreChanged = () => {
        const storeState: VCTypes.PolicyContainerState = this.props.blobSizeStore.getData();

        let policy: PolicyConfiguration = null;
        policy = storeState.localPolicy;

        if (policy && policy.isEnabled && !policy.isDeleted) {
            let found: boolean = false;
            const existingValueInBytes: number = policy.settings.maximumGitBlobSizeInBytes;
            const existingValueInMB: number = +VCTypes.Utils.bytesToMB(existingValueInBytes).toFixed(2);
            this.setState({existingSizeInMB: existingValueInMB});

            // check to see if the existing value is in the list of options, if not, add it
            for (const entry of this.state.options) {
                if ((entry.key as number) === existingValueInMB) {
                    found = true;
                    break;
                }
            }

            if (!found) {
                // if the existing value isn't one of our defaults (ie the customer used an http post to set it)
                // add their current setting to the drop down
                const localOptions = this.state.options;
                localOptions.push({key: existingValueInMB, text: `${existingValueInMB} ${VCResources.MB}`});
                localOptions.sort((a, b) => (a.key as number) - (b.key as number));
                this.setState({options: localOptions});
            }

            this.setState({selectedKey: existingValueInMB});
        } else {
            this.setState({selectedKey: -1});
        }

        this.setState(this.props.blobSizeStore.getData());
    }

   private _onDropdownChanged = (item: IDropdownOption) => {
        const value: number = (item.key as number) > 0 ? item.key as number : 0;

        this.props.actionCreator.setBlobSizeSetting(this.state.localPolicy, value > 0, value);
    }
}
