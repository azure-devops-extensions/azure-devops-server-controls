/// <reference types="react" />

import * as React from "react";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import * as Common from "DistributedTaskControls/Common/Common";
import * as ComponentBase from "DistributedTaskControls/Common/Components/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { GeneralOptionsStore, IGeneralOptionsState } from "PipelineWorkflow/Scripts/Editor/ContainerTabs/OptionsTab/GeneralOptionsStore";
import { OptionsActionsCreator } from "PipelineWorkflow/Scripts/Editor/ContainerTabs/OptionsTab/OptionsActionsCreator";
import { MultiLineInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/MultilineInputComponent";
import { ErrorComponent } from "DistributedTaskControls/SharedControls/ErrorComponent/ErrorComponent";
import { StringInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/StringInputComponent";
import { BooleanInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/BooleanInputComponent";
import { TooltipIfOverflow } from "DistributedTaskControls/Components/TooltipIfOverflow";
import { FeatureFlagUtils } from "PipelineWorkflow/Scripts/Shared/Utils/FeatureFlagUtils";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import { DataStoreInstanceIds } from "PipelineWorkflow/Scripts/Editor/Constants";

import * as Diag from "VSS/Diag";
import * as Utils_String from "VSS/Utils/String";

import { FocusZone, FocusZoneDirection } from "OfficeFabric/FocusZone";

/**
 * @brief Properties for General options details  view
 */
export interface IOptionsDetailsViewProps extends ComponentBase.IProps {
}

/**
 * @brief Controller view for Options details section
 */
export class GeneralOptionsDetailsView extends ComponentBase.Component<IOptionsDetailsViewProps, IGeneralOptionsState> {

    public componentWillMount(): void {
        this._optionsActions = ActionCreatorManager.GetActionCreator<OptionsActionsCreator>(OptionsActionsCreator);
        this._generalOptionsStore = StoreManager.GetStore<GeneralOptionsStore>(GeneralOptionsStore);
        this._generalOptionsStore.addChangedListener(this._onchange);

        this.setState(this._generalOptionsStore.getState());
    }

    public componentWillUnmount(): void {
        this._generalOptionsStore.removeChangedListener(this._onchange);
    }

    public render(): JSX.Element {
        return (
            <div className="cd-options-container">
                {this._getDescription()}

                {this._getReleaseNumberFormat()}
            </div>
        );
    }

    private _getDescription(): JSX.Element {
        let infoProps = {
            calloutContentProps: {
                calloutMarkdown: Resources.ReleaseDefinitionDescriptionHelpText
            }
        };

        return (
            <StringInputComponent
                cssClass={"cd-options-release-description"}
                label={Resources.DescriptionText}
                value={this.state.description}
                onValueChanged={this._setReleaseDefinitionDescription}
                isMultilineExpandable={true}
                infoProps={infoProps}
            />
        );
    }

    private _getReleaseNumberFormat(): JSX.Element {
        let infoProps = {
            calloutContentProps: {
                calloutMarkdown: Resources.ReleaseNameFormatHelpText
            }
        };

        return (
            <StringInputComponent
                cssClass={"cd-options-release-format"}
                label={Resources.ReleaseNameFormat}
                value={this.state.releaseNameFormat}
                onValueChanged={this._setReleaseNumberFormat}
                getErrorMessage={this._getErrorMessageForReleaseNumberFormat}
                infoProps={infoProps} />
        );
    }

    private _getErrorMessageForReleaseNumberFormat = (value: string): string => {
        return this._generalOptionsStore.isReleaseNameFormatValid(value)
            ? Utils_String.empty
            : Resources.ReleaseNameFormatInvalidErrorMessage;
    }

    private _onchange = () => {
        this.setState(this._generalOptionsStore.getState());
    }

    private _setReleaseDefinitionDescription = (newValue: string) => {
        this._optionsActions.updateReleaseDefinitionDescription(newValue);
    }

    private _setReleaseNumberFormat = (newValue: string) => {
        this._optionsActions.updateReleaseNameFormat(newValue);
    }

    private _generalOptionsStore: GeneralOptionsStore;
    private _optionsActions: OptionsActionsCreator;
}
