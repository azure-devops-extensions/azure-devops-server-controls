/// <reference types="react" />

import * as React from "react";

import { ErrorMessageParentKeyConstants, DemandInstances } from "CIWorkflow/Scripts/Common/Constants";
import { DefinitionUtils } from "CIWorkflow/Scripts/Common/DefinitionUtils";
import * as Resources from "CIWorkflow/Scripts/Resources/TFS.Resources.CIWorkflow";
import { BuildDefinitionActionsCreator } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/BuildDefinitionActionsCreator";
import { OptionsKeyConstants } from "CIWorkflow/Scripts/Scenarios/Definition/Common";
import { BuildProperties } from "CIWorkflow/Scripts/Scenarios/Definition/Components/BuildProperties";
import { StatusBadgeProperties } from "CIWorkflow/Scripts/Scenarios/Definition/Components/StatusBadgeProperties";
import { BuildJobDetailsView } from "CIWorkflow/Scripts/Scenarios/Definition/ControllerViews/BuildJobDetailsView";
import { BuildOptionView } from "CIWorkflow/Scripts/Scenarios/Definition/ControllerViews/BuildOptionView";
import { BuildOptionsListStore, IBuildOptionsListState } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/BuildOptionsListStore";
import { DefaultRepositorySource } from "CIWorkflow/Scripts/Scenarios/Definition/Sources/DefaultRepositorySource";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { ITabItemProps } from "DistributedTaskControls/Common/Types";
import { Component as ErrorMessageBar } from "DistributedTaskControls/Components/InformationBar";
import { SettingsContainer } from "DistributedTaskControls/Components/SettingsContainer";
import { DemandsView } from "DistributedTaskControls/ControllerViews/DemandsView";
import * as DTCResources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";

import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import { BuildOption, DefinitionQuality } from "TFS/Build/Contracts";

import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { FeatureManagementService } from "VSS/FeatureManagement/Services"
import { getService } from "VSS/Service";
import * as Utils_String from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!CIWorkflow/Scripts/Scenarios/Definition/ControllerViews/OptionsTabControllerView";
import { ProjectVisibility } from "TFS/Core/Contracts";

export interface IOptionsTabControllerViewProps extends ITabItemProps {
    quality?: DefinitionQuality;
    isReadOnly?: boolean;
}

export class OptionsTabControllerView extends Base.Component<IOptionsTabControllerViewProps, IBuildOptionsListState> {
    private _buildOptionsListStore: BuildOptionsListStore;

    public componentWillMount(): void {
        this._buildOptionsListStore = StoreManager.GetStore<BuildOptionsListStore>(BuildOptionsListStore);
        this.setState(this._buildOptionsListStore.getState());
        this._buildOptionsListStore.addChangedListener(this._onStoreUpdate);
    }

    public componentWillUnmount(): void {
        this._buildOptionsListStore.removeChangedListener(this._onStoreUpdate);
    }

    public render(): JSX.Element {
        const buildOptionsList = this._buildOptionsListStore.getState().buildOptionsList;
        const buildOptionDefinitionList = this._buildOptionsListStore.getBuildOptionDefinitions();
        let multiConfigurationOptionElement: JSX.Element = null;
        const optionsElements: JSX.Element[] = [];
        const qualityIsDraft: boolean = DefinitionUtils.isDraftDefinition(this.props.quality);

        if (buildOptionDefinitionList && buildOptionDefinitionList.length > 0) {
            for (const optionDef of buildOptionDefinitionList) {
                if (!this._buildOptionsListStore.isBuildOptionVisible(optionDef)) {
                    continue;
                }
                const matchingOption = buildOptionsList ? buildOptionsList.filter((option: BuildOption) => { return option.definition.id === optionDef.id; }) [0] : null;
                const isOptionEnabled = matchingOption ? matchingOption.enabled : false;

                const settingsContent = (optionDef.inputs && optionDef.inputs.length > 0)
                    ? (<BuildOptionView buildOption={matchingOption} buildOptionDefinition={optionDef} isReadOnly={this.props.isReadOnly} />)
                    : null;

                const settingsContainerElement =
                    (
                        <div role="region" aria-label={optionDef.name} key={optionDef.id}>
                            <SettingsContainer
                                settingKey={optionDef.id}
                                title={optionDef.name}
                                description={optionDef.description}
                                canToggle={true}
                                isEnabled={isOptionEnabled}
                                onToggle={this._onOptionToggle}
                                isReadOnly={!!this.props.isReadOnly}>
                                {settingsContent}
                            </SettingsContainer>
                        </div>
                    );

                if (Utils_String.equals(optionDef.id, OptionsKeyConstants.MultiConfiguration, true)) {
                    multiConfigurationOptionElement = settingsContainerElement;
                }
                else {
                    optionsElements.push(settingsContainerElement);
                }
            }
        }

        /*
        * commenting out until after the announcements on the 5th

        // to see the badge links UI in the definition editor:
        // public projects must be enabled
        // the project must be public
        // the user must not be using the new build preview page
        let isBadgeUiVisible: boolean = FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.AnonymousAccessFeatureName);

        if (isBadgeUiVisible) {
            const tfsContext = TfsContext.getDefault();
            const projectId = tfsContext.navigation.projectId;
            isBadgeUiVisible = DefaultRepositorySource.instance().getProjectVisibility(projectId) === ProjectVisibility.Public;

            if (isBadgeUiVisible) {
                const featureManagementService = getService(FeatureManagementService);
                isBadgeUiVisible = !featureManagementService.isFeatureEnabled("ms.vss-build-web.ci-preview-hub");
            }
        }

        */

        return (
            <div className="options-tab-content" role="region" aria-label={Resources.ARIALabelOptions}>
                <ErrorMessageBar parentKey={ErrorMessageParentKeyConstants.Options} cssClass="options-error-message-bar" />

                <div className="ci-definition-pivot-pane left-pane">
                    {!qualityIsDraft &&
                        <div role="region" aria-label={Resources.ARIALabelBuildDefinitionOptionsBuildProps}>
                            <SettingsContainer
                                settingKey={OptionsKeyConstants.BuildProperties}
                                title={Resources.BuildPropertiesTitle}
                                description={Resources.BuildPropertiesDescription}
                                canToggle={false}>
                            <BuildProperties oldBadgeUrl={this.state.oldBadgeUrl} disabled={!!this.props.isReadOnly} />
                            </SettingsContainer>
                        </div>
                  }

                    {optionsElements}

                    {/* isBadgeUiVisible && */
                        <div role="region" area-label={Resources.ARIALabelBuildDefinitionOptionsStatusBadgeVisualization}>
                            <SettingsContainer
                                settingKey={OptionsKeyConstants.StatusBadge}
                                title={Resources.StatusBadgeTitle}
                                description={Utils_String.empty}
                                canToggle={false}>
                                <StatusBadgeProperties />
                            </SettingsContainer>
                        </div>
                    }
                </div>

                <div className="ci-definition-pivot-pane right-pane">
                    {!qualityIsDraft &&
                        <div role="region" aria-label={Resources.ARIALabelBuildDefinitionOptionsAgents}>
                            <SettingsContainer
                                settingKey={OptionsKeyConstants.Agents}
                                title={Resources.BuildJobText}
                                description={Resources.BuildJobDetailsDescription}
                                canToggle={false}>
                                <BuildJobDetailsView isReadOnly={!!this.props.isReadOnly} />
                            </SettingsContainer>
                        </div>
                    }

                    {!qualityIsDraft &&
                        <div role="region" aria-label={Resources.ARIALabelBuildDefinitionOptionsDemandsView}>
                            <SettingsContainer
                                settingKey={OptionsKeyConstants.Demands}
                                title={DTCResources.DemandsTitle}
                                description={DTCResources.DemandsDescription}
                                canToggle={false}>
                                <DemandsView instanceId={DemandInstances.DefinitionInstance}
                                    nameMaxWidth={250}
                                    conditionMaxWidth={150}
                                    isReadOnly={!!this.props.isReadOnly} />
                            </SettingsContainer>
                        </div>
                    }

                    {
                        multiConfigurationOptionElement ?
                            <div role="region" aria-label={Resources.ARIALabelBuildDefinitionOptionsMultiConfig}>
                                {multiConfigurationOptionElement}
                            </div>
                            : null
                    }

                </div>
            </div>
        );
    }

    private _onStoreUpdate = () => {
        this.setState(this._buildOptionsListStore.getState());
    }

    private _onOptionToggle = (settingKey: string, newValue: boolean) => {
        ActionCreatorManager.GetActionCreator<BuildDefinitionActionsCreator>(BuildDefinitionActionsCreator).toggleBuildOption(settingKey, newValue);
    }
}
