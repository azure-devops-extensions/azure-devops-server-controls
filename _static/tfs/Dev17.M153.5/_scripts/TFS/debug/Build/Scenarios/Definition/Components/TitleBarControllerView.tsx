/// <reference types="react" />
/// <reference types="react-dom" />

import * as React from "react";

import { ButtonWithBowtieIcon } from "Build/Scripts/Components/ButtonWithBowtieIcon";
import { IDefinitionSearchPickerOption } from "Build/Scripts/Components/DefinitionSearchPicker";
import { LinkWithBowtieIcon } from "Build/Scripts/Components/LinkWithBowtieIcon";
import { TitleBar } from "Build/Scenarios/Definition/Components/TitleBar";
import { ViewStateStore, getInstance as getViewStateStore } from "Build/Scenarios/Definition/ViewState";
import { UserActions } from "Build/Scripts/Constants";
import { getDefaultBreadcrumbUrlForDefinition, getDefinitionEditorLink, BuildHelpLink } from "Build/Scripts/Linking";
import { QueryResult } from "Build/Scripts/QueryResult";
import * as BuildResources from "Build/Scripts/Resources/TFS.Resources.Build";
import { hasDefinitionPermission } from "Build/Scripts/Security";
import { BuildStore, getBuildStore } from "Build/Scripts/Stores/Builds";
import { DefinitionStore, getDefinitionStore } from "Build/Scripts/Stores/Definitions";
import { Features, Sources, publishEvent } from "Build/Scripts/Telemetry";

import { BuildPermissions } from "Build.Common/Scripts/Generated/TFS.Build2.Common";

import * as TFS_Resources_Presentation from "Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation";

import { BuildDefinitionReference, BuildReference } from "TFS/Build/Contracts";

import { getService as getEventService } from "VSS/Events/Services";
import { getHistoryService, HistoryService } from "VSS/Navigation/Services";

export interface IData {
    historyService: HistoryService;
    viewStateStore: ViewStateStore;
    definitionStore: DefinitionStore;
    buildStore: BuildStore;
}

export interface Props {
    title: string;
    telemetrySource: string;
    readonly?: boolean;
    definitionPickerOptionChanged?: (option: IDefinitionSearchPickerOption, index: number) => void;
}

export interface State {
    definition: BuildDefinitionReference;
    history: QueryResult<BuildReference[]>;
    definitionEditorLink: string;
    canEditSecurity: boolean;
    canEditDefinition: boolean;
    canQueueBuilds: boolean;
}

export class TitleBarControllerView extends React.Component<Props, State> {
    private _viewState: ViewStateStore;
    private _definitionStore: DefinitionStore;
    private _buildStore: BuildStore;

    constructor(props: Props, data?: IData) {
        super(props);

        let historyService = (data && data.historyService) ? data.historyService : getHistoryService();
        let urlState = historyService.getCurrentState();
        this._viewState = (data && data.viewStateStore) ? data.viewStateStore : getViewStateStore(urlState);

        this._definitionStore = (data && data.definitionStore) ? data.definitionStore : getDefinitionStore();
        this._buildStore = (data && data.buildStore) ? data.buildStore : getBuildStore();

        this.state = this._getState();
    }

    public render(): JSX.Element {
        if (!this.state.definition) {
            return null;
        }

        return <TitleBar
            title={this.props.title}
            readonly={this.props.readonly}
            definitionId={this.state.definition.id}
            definitionName={this.state.definition.name}
            path={this.state.definition.path}
            history={this.state.history}
            getBreadcrumbLink={getDefaultBreadcrumbUrlForDefinition}
            definitionPickerOptionChanged={this.props.definitionPickerOptionChanged}>
                { this.state.canQueueBuilds && <ButtonWithBowtieIcon isCta={true} onClick={this._onQueueBuildClicked} iconClassName="bowtie-build-queue-new" label={BuildResources.QueueNewBuildMenuItemText} /> }
                { this.state.canEditDefinition && <LinkWithBowtieIcon href={this.state.definitionEditorLink} iconClassName="bowtie-edit-outline" label={BuildResources.EditDefinitionButtonText} /> }
                { this.state.canEditSecurity && <ButtonWithBowtieIcon onClick={this._onSecurityClicked} iconClassName="bowtie-shield" label={BuildResources.SecurityText} /> }
                <LinkWithBowtieIcon href={BuildHelpLink} onClick={this._onHelpClicked} iconClassName="bowtie-status-help-outline" label={TFS_Resources_Presentation.HelpMenuText} />
        </TitleBar>;
    }

    public componentDidMount() {
        this._viewState.addChangedListener(this._onStoresUpdated);
        this._definitionStore.addChangedListener(this._onStoresUpdated);
        this._buildStore.addChangedListener(this._onStoresUpdated);
    }

    public componentWillUnmount() {
        this._viewState.removeChangedListener(this._onStoresUpdated);
        this._definitionStore.removeChangedListener(this._onStoresUpdated);
        this._buildStore.removeChangedListener(this._onStoresUpdated);
    }

    private _getState(): State {
        const definitionId: number = this._viewState.getDefinitionId();

        const definition = this._definitionStore.getDefinition(definitionId);
        const history = this._buildStore.getDefinitionHistory(definitionId, 2);

        return {
            definition: definition.result,
            history: history,
            definitionEditorLink: getDefinitionEditorLink(definitionId),
            canEditSecurity: hasDefinitionPermission(definition.result, BuildPermissions.AdministerBuildPermissions),
            canEditDefinition: hasDefinitionPermission(definition.result, BuildPermissions.EditBuildDefinition),
            canQueueBuilds: hasDefinitionPermission(definition.result, BuildPermissions.QueueBuilds)
        };
    }

    private _onSecurityClicked = () => {
        if (this.state.definition) {
            getEventService().fire(UserActions.ViewDefinitionSecurity, this, this.state.definition);
        }
    };

    private _onQueueBuildClicked = () => {
        // telemetry for creating new definitions is reported in the dialog's ok/cancel handlers
        getEventService().fire(UserActions.QueueBuild, this, this._viewState.getDefinitionId());
    };

    private _onHelpClicked = () => {
        publishEvent(Features.DefinitionsHelpClicked, this.props.telemetrySource);
    };

    private _onStoresUpdated = () => {
        this.setState(this._getState());
    };
}
