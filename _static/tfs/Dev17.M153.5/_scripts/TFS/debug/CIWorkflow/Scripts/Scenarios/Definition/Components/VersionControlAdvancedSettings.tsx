/// <reference types="react" />

import * as React from "react";

import { RepositoryTypes } from "Build.Common/Scripts/Generated/TFS.Build2.Common";

import * as Resources from "CIWorkflow/Scripts/Resources/TFS.Resources.CIWorkflow";
import { SourceProviderUtils } from "CIWorkflow/Scripts/Scenarios/Definition/SourceProvider";
import { CleanSourcesComponent } from "CIWorkflow/Scripts/Scenarios/Definition/Components/CleanSourcesComponent";
import { ISourceLabelOption, ISourceLabelProps } from "CIWorkflow/Scripts/Common/ScmUtils";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { ICalloutContentProps } from "DistributedTaskControls/Components/CalloutComponent";
import { IInfoProps } from "DistributedTaskControls/SharedControls/InputControls/Common";
import { BooleanInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/BooleanInputComponent";
import { DropDownInputControl, IDropDownItem } from "DistributedTaskControls/SharedControls/InputControls/Components/DropDownInputComponent";
import { RadioInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/RadioInputComponent";
import { StringInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/StringInputComponent";

import { IChoiceGroupOption } from "OfficeFabric/components/ChoiceGroup/ChoiceGroup.types";
import { IDropdownOption } from "OfficeFabric/components/Dropdown/Dropdown.types";

import { RepositoryCleanOptions } from "TFS/Build/Contracts";

import * as Utils_String from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!fabric";
import "VSS/LoaderPlugins/Css!Site";
import "VSS/LoaderPlugins/Css!DistributedTaskControls/Styles/FabricStyleOverrides";
import "VSS/LoaderPlugins/Css!DistributedTaskControls/Components/InfoButton";
import "VSS/LoaderPlugins/Css!CIWorkflow/Scripts/Scenarios/Definition/Components/GitVCAdvancedSettings";

export interface IProps extends Base.IProps {
    repoType: string;
    showAdvancedSettings: boolean;
    showLabelSourcesOption?: boolean;
    showReportStatusOption?: boolean;
    sourceLabel?: ISourceLabelProps;
    cleanRepository?: string;
    isCleanRepositoryEnabled?: boolean;
    cleanOptions?: string;
    reportBuildStatus?: boolean;
    sourceLabelOptions?: ISourceLabelOption[];
    onSelectedSourceLabelOptionChanged?: (selectedSourceOption?: IChoiceGroupOption) => void;
    onSelectedSourceLabelFormatChanged?: (selectedSourceLabelFormat: string) => void;
    validateLabelSourcesFormat?: (value: string) => string;
    onReportBuildStatusOptionChanged?: (isChecked?: boolean) => void;
    onCleanRepositoryOptionChanged?: (newValue: string) => void;
    onCleanOptionChanged?: (options: IDropdownOption, index: number) => void;
    isReadOnly?: boolean;
}

export class Component extends Base.Component<IProps, Base.IStateless> {

    public render(): JSX.Element {
        let tagSourcesFormatType: string = this._isTfvcRepo() ? Resources.LabelSourcesFormat : Resources.TagSourcesFormatText;
        let sourcesLabelFormatCalloutContentProps = {
            calloutDescription: Utils_String.format(Resources.TagSourcesFormatCalloutDescription, tagSourcesFormatType),
            calloutMarkdown: Resources.TagSourcesCalloutMoreInfo
        };
        let sourcesLabelFormatInfoProps: IInfoProps = {
            calloutContentProps: sourcesLabelFormatCalloutContentProps
        };

        let reportBuildStatusCalloutContentProps = {
            calloutDescription: Resources.ReportBuildStatusDescription
        };
        let reportBuildStatusInfoProps: IInfoProps = {
            calloutContentProps: reportBuildStatusCalloutContentProps
        };

        let tagSourcesType: string = this._isTfvcRepo() ? Resources.LabelText : Resources.TagText;
        let tagSourcesCalloutContentProps = {
            calloutDescription: Utils_String.format(Resources.TagSourcesCalloutDescription, tagSourcesType),
            calloutMarkdown: Resources.TagSourcesCalloutMoreInfo
        };
        let tagSourcesInfoProps: IInfoProps = {
            calloutContentProps: tagSourcesCalloutContentProps
        };

        return (
            <div className="ci-sources-settings">
                {
                    this.props.showAdvancedSettings && (
                        <div>
                            <div className="ci-sources-advanced-settings">
                                <div className="ci-getsources-toggle">
                                    <CleanSourcesComponent
                                        onCleanRepositoryChanged={this.props.onCleanRepositoryOptionChanged}
                                        cleanRepository={this.props.cleanRepository}
                                        infoProps={this._getCleanOptionsInfoProps()}
                                        onCleanOptionsChanged={(val: IDropDownItem) => { this.props.onCleanOptionChanged(val.option, val.index); } }
                                        cleanOption={this._getCleanOption()}
                                        possibleCleanOptions={this._getCleanOptionsDropdown()}
                                        isCleanRepositoryEnabled={this.props.isCleanRepositoryEnabled}
                                        cleanOptionsCssClass={"clean-options-dropdown"}
                                        isReadOnly={!!this.props.isReadOnly} />
                                </div>

                                {
                                    this.props.showLabelSourcesOption ?
                                    (<div className="ci-tag-source">
                                        <RadioInputComponent
                                            label={(this.props.repoType === RepositoryTypes.TfsVersionControl) ? Resources.LabelSourcesText : Resources.TagSourcesText}
                                            infoProps={tagSourcesInfoProps}
                                            cssClass="fabric-style-overrides advanced-item"
                                            options={this._getSourceLabelOptions()}
                                            onValueChanged={(newOption: IChoiceGroupOption) => { this.props.onSelectedSourceLabelOptionChanged(newOption); }}
                                            showOptionsVertically={true}
                                            disabled={!!this.props.isReadOnly} />
                                    </div>) : null
                                }

                                {
                                    this.props.sourceLabel && this.props.sourceLabel.showSourceLabelFormat ?
                                    (<div className="ci-tag-sources-format">
                                        <StringInputComponent
                                            label={(this.props.repoType === RepositoryTypes.TfsVersionControl) ? Resources.LabelSourcesFormat : Resources.TagSourcesFormatText}
                                            infoProps={sourcesLabelFormatInfoProps}
                                            cssClass="advanced-item"
                                            value={this.props.sourceLabel.sourceLabelFormat}
                                            onValueChanged={(newValue: string) => { this.props.onSelectedSourceLabelFormatChanged(newValue); }}
                                            getErrorMessage={this.props.validateLabelSourcesFormat}
                                            disabled={!!this.props.isReadOnly} />
                                    </div>) : null
                                }

                                {
                                    this.props.showReportStatusOption ?
                                    (<div className="ci-getsources-toggle advanced-item">
                                        <BooleanInputComponent
                                            cssClass="toggle-control"
                                            label={Resources.ReportBuildStatusText}
                                            value={this.props.reportBuildStatus}
                                            onValueChanged={this.props.onReportBuildStatusOptionChanged}
                                            infoProps={reportBuildStatusInfoProps}
                                            disabled={!!this.props.isReadOnly} />
                                    </div>) : null
                                }

                                {this.props.children}
                            </div>
                        </div>
                    )
                }
            </div>
        );
    }

    private _isTfvcRepo(): boolean {
        return (this.props.repoType === RepositoryTypes.TfsVersionControl);
    }

    private _getSourceLabelOptions(): IChoiceGroupOption[] {
        let sourceLabelOptions: IChoiceGroupOption[] = [];

        this.props.sourceLabelOptions.forEach((sourceLabelOption: ISourceLabelOption) => {
            sourceLabelOptions.push({
                key: sourceLabelOption.key,
                text: sourceLabelOption.text,
                checked: this.props.sourceLabel.sourceLabelOption === sourceLabelOption.key
            } as IChoiceGroupOption);
        });

        return sourceLabelOptions;
    }

    private _getCleanOptionsDropdown(): IDropdownOption[] {
        let options: IDropdownOption[] = [];
        options.push({ key: RepositoryCleanOptions.Source + 1, text: Resources.BuildRepositoryCleanOptionsSourcesLabel });
        options.push({ key: RepositoryCleanOptions.SourceAndOutputDir + 1, text: Resources.BuildRepositoryCleanOptionsSourcesAndOutputDirLabel });
        options.push({ key: RepositoryCleanOptions.SourceDir + 1, text: Resources.BuildRepositoryCleanOptionsSourcesDirLabel });
        options.push({ key: RepositoryCleanOptions.AllBuildDir + 1, text: Resources.BuildRepositoryCleanOptionsAllBuildDirLabel });

        return options;
    }

    private _getCleanOption(): number {
        let selectedCleanOption: number = parseInt(this.props.cleanOptions) + 1;
        return selectedCleanOption;
    }

    private _getCleanOptionsInfoProps(): IInfoProps {
        return {
            calloutContentProps: {
                calloutDescription: SourceProviderUtils.getCleanHelp(this.props.repoType),
                calloutMarkdown: SourceProviderUtils.getCleanLink(this.props.repoType)
            }
        } as IInfoProps;
    }
}
