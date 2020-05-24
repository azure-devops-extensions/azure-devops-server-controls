/// <reference types="react" />

import * as React from "react";

import * as Resources from "CIWorkflow/Scripts/Resources/TFS.Resources.CIWorkflow";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { Boolean } from "DistributedTaskControls/Common/Primitives";
import { IInfoProps } from "DistributedTaskControls/SharedControls/InputControls/Common";
import { BooleanInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/BooleanInputComponent";
import { DropDownInputControl, IDropDownItem } from "DistributedTaskControls/SharedControls/InputControls/Components/DropDownInputComponent";
import { StringInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/StringInputComponent";

import { IDropdownOption } from "OfficeFabric/components/Dropdown/Dropdown.types";

import "VSS/LoaderPlugins/Css!fabric";
import "VSS/LoaderPlugins/Css!Site";
import "VSS/LoaderPlugins/Css!DistributedTaskControls/Styles/FabricStyleOverrides";
import "VSS/LoaderPlugins/Css!DistributedTaskControls/Components/InfoButton";
import "VSS/LoaderPlugins/Css!CIWorkflow/Scripts/Scenarios/Definition/Components/GitVCAdvancedSettings";

export interface IProps extends Base.IProps {
    checkoutSubmodules?: boolean;
    checkoutNestedSubmodules?: boolean;
    gitLfsSupportStatus?: boolean;
    skipSyncSourcesStatus?: boolean;
    shallowFetch?: boolean;
    shallowFetchDepth?: string;
    onGitLfsSupportOptionChanged?: (isChecked?: boolean) => void;
    onSkipSyncSourcesOptionChanged?: (isChecked?: boolean) => void;
    onShallowFetchOptionChanged?: (isChecked?: boolean) => void;
    onCheckoutSubmodulesOptionChanged?: (isChecked?: boolean) => void;
    onSubmoduleCheckoutRecursiveLevelChanged?: (options: IDropdownOption, index: number) => void;
    onShallowFetchDepthChanged?: (newValue: string) => void;
    getErrorMessage?: (value: string) => string;
    onNotifyValidation?: (value: string) => void;
    isReadOnly?: boolean;
}

export class GitCommonSettings extends Base.Component<IProps, Base.IStateless> {

    public render(): JSX.Element {
        let shallowFetchDepthCalloutContentProps = {
            calloutMarkdown: Resources.GitShallowHelpMarkdown
        };
        let shallowFetchDepthInfoProps: IInfoProps = {
            calloutContentProps: shallowFetchDepthCalloutContentProps
        };

        let gitLfsSupportInfoContent = {
            calloutMarkdown: Resources.GitLfsSupportHelpMarkDown
        };
        let gitLfsSupportInfoProps: IInfoProps = {
            calloutContentProps: gitLfsSupportInfoContent
        };

        let skipSyncSourcesInfoContent = {
            calloutMarkdown: Resources.SkipSyncSourcesHelpMarkdown
        };
        let skipSyncSourcesInfoProps: IInfoProps = {
            calloutContentProps: skipSyncSourcesInfoContent
        };

        let gitCheckoutSubmodulesInfoContent = {
            calloutMarkdown: Resources.GitCheckoutSubmodulesHelpMarkdown
        };
        let gitCheckoutSubmodulesInfoProps: IInfoProps = {
            calloutContentProps: gitCheckoutSubmodulesInfoContent
        };

        return (
            <div>
                <div className="ci-sources-advanced-settings">
                    <div className="advanced-item">
                        <BooleanInputComponent
                            label={Resources.CheckSubmodulesText}
                            value={this.props.checkoutSubmodules}
                            onValueChanged={this.props.onCheckoutSubmodulesOptionChanged} 
                            infoProps={gitCheckoutSubmodulesInfoProps}
                            disabled={!!this.props.isReadOnly} />
                        {
                            this.props.checkoutSubmodules &&
                            <div className="nested-submodule-option">
                                <DropDownInputControl
                                    cssClass="git-submodule-dropdown"
                                    label={Resources.SubmoduleCheckoutRecursiveLevelLabel}
                                    options={this._getSubmoduleCheckoutRecursiveLevelOptionsDropdown()}
                                    onValueChanged={(val: IDropDownItem) => { this.props.onSubmoduleCheckoutRecursiveLevelChanged(val.option, val.index); }}
                                    selectedKey={this._getSubmoduleCheckoutRecursiveLevel()}
                                    disabled={!!this.props.isReadOnly || !this.props.checkoutSubmodules}
                                />
                            </div>
                        }
                    </div>
                    <div className="advanced-item">
                        <BooleanInputComponent
                            label={Resources.GitLfsSupportLabel}
                            cssClass="git-advanced-settings-item"
                            value={this.props.gitLfsSupportStatus}
                            onValueChanged={this.props.onGitLfsSupportOptionChanged}
                            infoProps={gitLfsSupportInfoProps}
                            disabled={!!this.props.isReadOnly} />
                    </div>
                    <div className="advanced-item">
                        <BooleanInputComponent
                            label={Resources.SkipSyncSourcesLabel}
                            cssClass="git-advanced-settings-item"
                            value={this.props.skipSyncSourcesStatus}
                            onValueChanged={this.props.onSkipSyncSourcesOptionChanged}
                            infoProps={skipSyncSourcesInfoProps}
                            disabled={!!this.props.isReadOnly} />
                    </div>
                    <div className="git-advanced-item">
                        <BooleanInputComponent
                            label={Resources.ShallowFetchLabel}
                            value={this.props.shallowFetch}
                            onValueChanged={this.props.onShallowFetchOptionChanged} 
                            infoProps={shallowFetchDepthInfoProps}
                            disabled={!!this.props.isReadOnly} />
                        {
                            this.props.shallowFetch &&
                            <div className="ci-shallow-depth">
                                <StringInputComponent
                                    cssClass="git-settings"
                                    label={Resources.Depth}
                                    value={this.props.shallowFetchDepth}
                                    disabled={!!this.props.isReadOnly || !this.props.shallowFetch}
                                    onValueChanged={(newValue: string) => { this.props.onShallowFetchDepthChanged(newValue); }}
                                    getErrorMessage={(value: string) => { return this._getErrorMessage(value); }}
                                />
                            </div>
                        }
                    </div>
                </div>
            </div>
        );
    }

    private _getErrorMessage(value: string): string {
        return this.props.getErrorMessage(value);
    }

    private _getSubmoduleCheckoutRecursiveLevelOptionsDropdown(): IDropdownOption[] {
        let options: IDropdownOption[] = [];
        options.push({ key: Boolean.falseString, text: Resources.CheckoutSubmoduleTopLevelOnlyLabel });
        options.push({ key: Boolean.trueString, text: Resources.CheckoutSubmoduleAllNestedLabel });

        return options;
    }

    private _getSubmoduleCheckoutRecursiveLevel(): string {
        return Boolean.toString(this.props.checkoutNestedSubmodules);
    }
}
