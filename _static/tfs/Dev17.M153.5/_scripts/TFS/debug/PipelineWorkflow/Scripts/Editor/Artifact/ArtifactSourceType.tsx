import * as React from "react";

import * as ComponentBase from "DistributedTaskControls/Common/Components/Base";
import { RadioInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/RadioInputComponent";
import { TooltipIfOverflow } from "DistributedTaskControls/Components/TooltipIfOverflow";

import * as Utils_Core from "VSS/Utils/Core";
import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";

import { ArtifactUtility } from "PipelineWorkflow/Scripts/Common/ArtifactUtility";
import { ISelectableArtifactType } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactTypeStore";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import { IChoiceGroupOption } from "OfficeFabric/ChoiceGroup";
import { Link } from "OfficeFabric/Link";
import { Icon } from "OfficeFabric/Icon";
import { autobind, css } from "OfficeFabric/Utilities";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/Common/FabricStyleOverrides";
import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/Editor/Artifact/ArtifactSourceType";

export interface IArtifactSourceTypeProps extends ComponentBase.IProps {
    artifactTypes: ISelectableArtifactType[];
    selectedKey?: string;
    onSourceTypeChanged: (selectedArtifactType: ISelectableArtifactType) => void;
}

export interface IArtifactSourceTypeState extends IArtifactSourceTypeProps {
    availableOptions: IChoiceGroupOption[];
    optionsDisplayed: IChoiceGroupOption[];
    showAll: boolean;
}

export class ArtifactSourceType extends ComponentBase.Component<IArtifactSourceTypeProps, IArtifactSourceTypeState> {

    public componentWillMount(): void {
        let availableOptions = this._getAllOptions(this.props.artifactTypes);
        this.setState({ availableOptions: availableOptions, showAll: false, selectedKey: this.props.selectedKey, optionsDisplayed: this._getOptions(availableOptions, false, this.props.selectedKey) });
    }

    public render(): JSX.Element {
        return (<div className="artifact-source-type">
            <RadioInputComponent
                ref={this._resolveRef("_artifactTypesRadioInput")}
                cssClass={"source-type-input"}
                label={Resources.SourceType}
                options={this.state.optionsDisplayed}
                onValueChanged={this._onValueChanged} />
            {
                this.state.optionsDisplayed && this.state.availableOptions.length > ArtifactSourceType.c_numOptionsInRow &&
                <Link
                    className={"source-types-see-more"}
                    onClick={this._toggleSeeMore}>
                    {this._getLinkContent()}
                </Link>
            }
        </div>);
    }

    private _getLinkContent(): JSX.Element {
        if (this.state.showAll) {
            return (
                <div>
                    {Resources.ArtifactSourceTypeShowLess}
                    <div className="chevron bowtie-icon bowtie-chevron-up-light" />
                </div>
            );
        }
        else {
            let pendingOptions = this.state.availableOptions.length - this.state.optionsDisplayed.length;
            return (
                <div>
                    {Utils_String.format(Resources.ArtifactSourceTypeShowMore, pendingOptions)}
                    <div className="chevron bowtie-icon bowtie-chevron-down-light" />
                </div>
            );
        }
    }

    private _getAllOptions(artifactTypes: ISelectableArtifactType[]): IChoiceGroupOption[] {
        let sourceOptions: IChoiceGroupOption[] = [];
        if (artifactTypes) {
            artifactTypes.forEach((artifactType: ISelectableArtifactType) => {
                sourceOptions.push({
                    key: artifactType.displayName,
                    text: artifactType.displayName,
                    onRenderField: (option: IChoiceGroupOption) => { return this._onArtifactSourceTypeFieldRender(artifactType.artifactType, option); }
                });
            });
        }
        return sourceOptions;
    }

    private _getOptions(availableOptions: IChoiceGroupOption[], showAll: boolean, selectedKey: string): IChoiceGroupOption[] {
        let options: IChoiceGroupOption[] = [];

        if (availableOptions) {
            let selectedIndex = -1;
            if (selectedKey) {
                availableOptions.some((option: IChoiceGroupOption, index: number) => {
                    if (Utils_String.ignoreCaseComparer(option.key, selectedKey) === 0) {
                        selectedIndex = index;
                        return true;
                    }
                });
            }

            if (showAll) {
                options = availableOptions;
            }
            else {
                let startIndex = selectedKey ? Math.floor(selectedIndex / ArtifactSourceType.c_numOptionsInRow) * ArtifactSourceType.c_numOptionsInRow : 0;
                options = availableOptions.slice(startIndex, startIndex + ArtifactSourceType.c_numOptionsInRow);

                selectedIndex = selectedIndex % ArtifactSourceType.c_numOptionsInRow;
            }

            if (selectedIndex >= 0) {
                options[selectedIndex].checked = true;
            }
        }
        return options;
    }

    private _setFocus() {
        if (this._artifactTypesRadioInput) {
            this._artifactTypesRadioInput.setFocus();
        }
    }

    @autobind
    private _onArtifactSourceTypeFieldRender(artifactType: string, option: IChoiceGroupOption): JSX.Element {

        return (
            <label
                htmlFor={option.id}
                className={css("artifact-type-ChoiceField-field", option.checked ? "is-checked" : Utils_String.empty)}>
                {
                    <div className={css("artifact-type-ChoiceField-innerField")}>
                        <div className={css("artifact-type-ChoiceField-iconWrapper")}>
                            <Icon className={css("bowtie-icon", ArtifactUtility.getArtifactBowtieIcon(artifactType), "artifact-type-icon")} />
                        </div>
                    </div>
                }
                {
                    <div className={css("artifact-type-ChoiceField-labelWrapper")}>
                        <TooltipIfOverflow tooltip={option.text} targetElementClassName="artifact-type-label" >
                            <div className="artifact-type-label" >
                                {
                                    option.checked &&
                                    <div className="bowtie-icon bowtie-check" />
                                }
                                {option.text}
                            </div>
                        </TooltipIfOverflow>
                    </div>
                }
            </label>
        );

    }


    @autobind
    private _toggleSeeMore() {
        let showAll = !this.state.showAll;
        this.setState({ showAll: showAll, optionsDisplayed: this._getOptions(this.state.availableOptions, showAll, this.state.selectedKey) });
        if (showAll) {
            Utils_Core.delay(this, 0, () => { this._setFocus(); });
        }
    }

    @autobind
    private _onValueChanged(newValue: IChoiceGroupOption) {
        this.setState({ selectedKey: newValue.key });
        if (this.props.onSourceTypeChanged) {
            let selectedArtifactTypeDefinition = this._getArtifactTypeDefinition(newValue.key);
            this.props.onSourceTypeChanged(selectedArtifactTypeDefinition);
        }
    }

    @autobind
    private _getArtifactTypeDefinition(displayName: string): ISelectableArtifactType {
        return Utils_Array.first(this.props.artifactTypes, (artifactType) => Utils_String.equals(artifactType.displayName, displayName, true));
    }

    private _artifactTypesRadioInput: RadioInputComponent;
    public static readonly c_numOptionsInRow = 4;
}