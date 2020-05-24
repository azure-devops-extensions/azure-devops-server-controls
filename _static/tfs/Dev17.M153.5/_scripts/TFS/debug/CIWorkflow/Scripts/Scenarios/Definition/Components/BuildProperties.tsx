/// <reference types="react" />

import * as React from "react";

import * as Resources from "CIWorkflow/Scripts/Resources/TFS.Resources.CIWorkflow";
import { BuildDefinitionActionsCreator } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/BuildDefinitionActionsCreator";
import { BadgeUrlCopyButton } from "CIWorkflow/Scripts/Scenarios/Definition/Components/BadgeUrlCopyButton";
import { CoreDefinitionStore, ICoreDefinitionState } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/CoreDefinitionStore";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { TaskCIHubContributionId } from "DistributedTaskControls/Common/Common";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { ICalloutContentProps } from "DistributedTaskControls/Components/CalloutComponent";
import { Component as InfoButton } from "DistributedTaskControls/Components/InfoButton";
import { IInfoProps } from "DistributedTaskControls/SharedControls/InputControls/Common";
import { BooleanInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/BooleanInputComponent";
import { MultiLineInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/MultilineInputComponent";
import { StringInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/StringInputComponent";

import { ChoiceGroup } from "OfficeFabric/components/ChoiceGroup/ChoiceGroup";
import { IChoiceGroupOption } from "OfficeFabric/components/ChoiceGroup/ChoiceGroup.types";

import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";

import { DefinitionQueueStatus } from "TFS/Build/Contracts";

import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import * as Utils_Clipboard from "VSS/Utils/Clipboard";
import * as Utils_String from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/Components/Task/TaskInput";
import "VSS/LoaderPlugins/Css!DistributedTaskControls/Styles/FabricStyleOverrides";
import "VSS/LoaderPlugins/Css!CIWorkflow/Scripts/Scenarios/Definition/Components/StatusBadgeProperties";

export interface IBuildPropertiesProps extends Base.IProps {
    oldBadgeUrl: string;
    disabled?: boolean;
}

export class BuildProperties extends Base.Component<IBuildPropertiesProps, ICoreDefinitionState> {
    private _store: CoreDefinitionStore;
    private _actionCreator: BuildDefinitionActionsCreator;

    public constructor(props?: IBuildPropertiesProps) {
        super(props);

        this._store = StoreManager.GetStore<CoreDefinitionStore>(CoreDefinitionStore);
        this._actionCreator = ActionCreatorManager.GetActionCreator<BuildDefinitionActionsCreator>(BuildDefinitionActionsCreator);
        this._store.addChangedListener(this._onChange);

        this.state = this._store.getState();
    }

    public componentWillUnmount() {
        this._store.removeChangedListener(this._onChange);
    }

    public render(): JSX.Element {
        const buildNumberFormatInfoProps: IInfoProps = {
            calloutContentProps: this._getCallOutContent(Resources.BuildNumberFormatHelpText)
        };

        const badgeEnabledInfoProps: IInfoProps = {
            calloutContentProps: this._getCallOutContent(Resources.BadgeEnabledHelpMarkDown)
        };

        return (
            <div className="build-props">

                <div className="input-field-component">
                    <MultiLineInputComponent
                        isNotResizable={true}
                        label={Resources.DescriptionLabel}
                        value={this.state.description ? this.state.description : Utils_String.empty}
                        onValueChanged={this._onDescriptionChange}
                        disabled={!!this.props.disabled} />
                </div>

                <div className="input-field-component">
                    <StringInputComponent
                        label={Resources.BuildNumberFormatLabel}
                        infoProps={buildNumberFormatInfoProps}
                        value={this.state.buildNumberFormat}
                        onValueChanged={this._onBuildNumberFormatChange}
                        disabled={!!this.props.disabled} />
                </div>

                <div className="input-field-component">
                    <div className="input-field-component">
                        <ChoiceGroup
                            label={Resources.QueueStatusLabel}
                            options={this._getQueueStatusOptions()}
                            onChange={this._onQueueStatusChange}
                            disabled={!!this.props.disabled} />
                    </div>
                </div>
            </div>
        );
    }

    private _getQueueStatusOptions(): IChoiceGroupOption[] {
        const queueStatusOptions: IChoiceGroupOption[] = [];

        queueStatusOptions.push({
            key: DefinitionQueueStatus.Enabled.toString(),
            text: Utils_String.localeFormat(Resources.QueueStatusOptionsFormat, Resources.Enabled, Resources.EnabledDefinitionDescription),
            checked: this.state.queueStatus === DefinitionQueueStatus.Enabled
        });
        queueStatusOptions.push({
            key: DefinitionQueueStatus.Paused.toString(),
            text: Utils_String.localeFormat(Resources.QueueStatusOptionsFormat, Resources.Paused, Resources.PausedDefinitionDescription),
            checked: this.state.queueStatus === DefinitionQueueStatus.Paused
        });
        queueStatusOptions.push({
            key: DefinitionQueueStatus.Disabled.toString(),
            text: Utils_String.localeFormat(Resources.QueueStatusOptionsFormat, Resources.Disabled, Resources.DisabledDefinitionDescription),
            checked: this.state.queueStatus === DefinitionQueueStatus.Disabled
        });

        return queueStatusOptions;
    }

    private _onChange = () => {
        this.setState(this._store.getState());
    }

    private _onDescriptionChange = (description: string) => {
        this._actionCreator.changeDescription(description);
    }

    private _onBuildNumberFormatChange = (buildNumberFormat: string) => {
        this._actionCreator.changeBuildNumberFormat(buildNumberFormat);
    }

    private _onBadgeEnabledToggle = (badgeEnabled: boolean) => {
        this._actionCreator.changeBadgeEnabled(badgeEnabled);
    }

    private _onQueueStatusChange = (event?: React.SyntheticEvent<HTMLInputElement>, queueStatus?: IChoiceGroupOption) => {
        // Enum to string conversion neccesary since ChoiceGroupOptions only take strings as keys
        switch (queueStatus.key) {
            case DefinitionQueueStatus.Paused.toString():
                this._actionCreator.changeQueueStatus(DefinitionQueueStatus.Paused);
                break;

            case DefinitionQueueStatus.Disabled.toString():
                this._actionCreator.changeQueueStatus(DefinitionQueueStatus.Disabled);
                break;

            case DefinitionQueueStatus.Enabled.toString():
            default:
                this._actionCreator.changeQueueStatus(DefinitionQueueStatus.Enabled);
                break;
        }
    }

    private _getCallOutContent(infoHelpText: string): ICalloutContentProps {
        return {
            calloutMarkdown: infoHelpText
        };
    }

    private _copyBadgeUrlToClipboard = (): void => {
        Utils_Clipboard.copyToClipboard(this.props.oldBadgeUrl);
    }
}
