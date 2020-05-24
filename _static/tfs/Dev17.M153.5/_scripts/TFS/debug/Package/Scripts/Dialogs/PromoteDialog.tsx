import * as React from "react";

import { DefaultButton, PrimaryButton } from "OfficeFabric/Button";
import { Dialog, DialogFooter } from "OfficeFabric/Dialog";
import { Dropdown, IDropdownOption } from "OfficeFabric/Dropdown";
import { IIconProps } from "OfficeFabric/Icon";
import { autobind, css } from "OfficeFabric/Utilities";

import { Component, Props, State } from "VSS/Flux/Component";
import * as Utils_String from "VSS/Utils/String";

import { PackageVersionPromoted, TogglePromoteDialog } from "Package/Scripts/Actions/Actions";
import { IMultiCommandPackageDetails, IPackagePromotedPayload } from "Package/Scripts/Common/ActionPayloads";
import * as PackageResources from "Feed/Common/Resources";
import { Feed } from "Package/Scripts/WebApi/VSS.CustomFeed.Contracts";
import { FeedView, Package, PackageVersion } from "Package/Scripts/WebApi/VSS.Feed.Contracts";

import "VSS/LoaderPlugins/Css!Package:Package/Scripts/Dialogs/PromoteDialog";

export interface IPromoteDialogProps extends Props {
    feed: Feed;
    selectedPackage: Package;
    selectedVersion: PackageVersion;
    views: FeedView[];
    isLoading?: boolean;
}

export interface IPromoteDialogState extends State {
    selectedViewOption?: IDropdownOption;
}

export class PromoteDialog extends Component<IPromoteDialogProps, IPromoteDialogState> {
    constructor(props: IPromoteDialogProps) {
        super(props);

        const alreadyPromotedViewIds = props.selectedVersion.views.map(v => v.id);
        this._viewOptions = props.views
            .map(view => {
                return {
                    key: view.id,
                    text: Utils_String.format("{0}@{1}", props.feed.name, view.name),
                    data: view
                } as IDropdownOption;
            })
            .filter(viewOption => viewOption && alreadyPromotedViewIds.indexOf(viewOption.key as string) < 0);

        this.state = {
            selectedViewOption: this._viewOptions.length > 0 ? this._viewOptions[0] : null
        };
    }

    public render(): JSX.Element {
        return (
            <Dialog
                hidden={false}
                modalProps={{ isBlocking: true }}
                forceFocusInsideTrap={true}
                onDismiss={this._closeDialog}
                title={PackageResources.PackageOperationsMenu_ReleasePackageDialogTitle}
            >
                {
                    <div>
                        {this._viewOptions.length < 1 ? (
                            <span>{PackageResources.ReleaseDialogContent_NoMoreViews}</span>
                        ) : (
                            <Dropdown
                                options={this._viewOptions}
                                selectedKey={this.state.selectedViewOption && this.state.selectedViewOption.key}
                                label={PackageResources.FeedViewDropdown_Title}
                                onChanged={viewOption => this._onChanged(viewOption)}
                            />
                        )}
                    </div>
                }
                <DialogFooter>{this._renderButtons()}</DialogFooter>
            </Dialog>
        );
    }

    private _renderButtons(): JSX.Element {
        return (
            <div>
                <PrimaryButton
                    onClick={this._save}
                    disabled={this.state.selectedViewOption == null || this.props.isLoading === true}
                    text={PackageResources.PromotePackage_PromoteButton}
                    iconProps={this._getPrimaryButtonIconProps()}
                />
                <DefaultButton
                    className={"promote-dialog-cancel-button"}
                    onClick={this._closeDialog}
                    text={PackageResources.Dialog_CancelButtonText}
                />
            </div>
        );
    }

    private _getPrimaryButtonIconProps(): IIconProps {
        if (this.props.isLoading === true) {
            return {
                className: css("bowtie-icon bowtie-spinner save-progress")
            } as IIconProps;
        }

        return null;
    }

    @autobind
    private _closeDialog(): void {
        TogglePromoteDialog.invoke(false);
    }

    @autobind
    private _save(): void {
        const packagePromotedDetails: IPackagePromotedPayload = {
            minimalPackageDetails: [
                {
                    id: this.props.selectedPackage.name,
                    version: this.props.selectedVersion.version,
                    protocolType: this.props.selectedPackage.protocolType
                }
            ] as IMultiCommandPackageDetails[],
            promotedView: this.state.selectedViewOption.data
        };
        PackageVersionPromoted.invoke(packagePromotedDetails);
    }

    @autobind
    private _onChanged(viewOption: IDropdownOption): void {
        this.setState({ selectedViewOption: viewOption });
    }

    private _viewOptions: IDropdownOption[];
}
