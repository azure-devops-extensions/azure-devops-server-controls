/// <reference types="react" />

import * as React from "react";

import * as Resources from "CIWorkflow/Scripts/Resources/TFS.Resources.CIWorkflow";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { Boolean } from "DistributedTaskControls/Common/Primitives";
import { IInfoProps } from "DistributedTaskControls/SharedControls/InputControls/Common";
import { ComboBoxInputComponent, ComboBoxType } from "DistributedTaskControls/SharedControls/InputControls/Components/ComboBoxInputComponent";
import { DropDownInputControl, IDropDownItem } from "DistributedTaskControls/SharedControls/InputControls/Components/DropDownInputComponent";

import { IDropdownOption } from "OfficeFabric/components/Dropdown/Dropdown.types";

export interface IProps extends Base.IProps {
    cleanRepository: string;
    isCleanRepositoryEnabled: boolean;
    cleanOption: number;
    possibleCleanOptions: IDropdownOption[];
    infoProps: IInfoProps;
    onCleanRepositoryChanged: (newValue: string) => void;
    onCleanOptionsChanged: (option: IDropDownItem) => void;
    cleanOptionsCssClass?: string;
    isReadOnly?: boolean;
}

export class CleanSourcesComponent extends Base.Component<IProps, Base.IStateless> {

    public render(): JSX.Element {
        let cleanInfoContent = {
            calloutMarkdown: Resources.CleanSourcesHelpMarkDown
        };
        let cleanInfoProps: IInfoProps = {
            calloutContentProps: cleanInfoContent
        };
        
        return (
            <div className="clean-options-component">
               <ComboBoxInputComponent
                    cssClass="clean-repository"
                    label={Resources.CleanLabel}
                    source={[Boolean.falseString, Boolean.trueString]}
                    onValueChanged={this.props.onCleanRepositoryChanged}
                    comboBoxType={ComboBoxType.Editable}
                    value={this.props.cleanRepository}
                    required={false}
                    infoProps={cleanInfoProps}
                    disabled={!!this.props.isReadOnly} />
                 {
                    this.props.isCleanRepositoryEnabled &&
                    <div className={"clean-options-component"}>
                        <DropDownInputControl
                            cssClass={this.props.cleanOptionsCssClass}
                            label={Resources.BuildRepositoryCleanOptionsLabel}
                            options={this.props.possibleCleanOptions}
                            onValueChanged={this.props.onCleanOptionsChanged}
                            selectedKey={this.props.cleanOption}
                            ariaLabel={Resources.ARIALabelCleanOptions}
                            disabled={!!this.props.isReadOnly}
                        />
                    </div>
                }
            </div>
        );
    }
}