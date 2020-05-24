/// <reference types="react" />
/// <reference types="react-dom" />

import * as Q from "q";
import * as ReactDOM from "react-dom";
import * as React from "react";

import { ErrorMessageParentKeyConstants, ImportConstants } from "CIWorkflow/Scripts/Common/Constants";
import { DefinitionUtils } from "CIWorkflow/Scripts/Common/DefinitionUtils";
import * as Resources from "CIWorkflow/Scripts/Resources/TFS.Resources.CIWorkflow";
import { DefaultPath } from "CIWorkflow/Scripts/Common/PathUtils";
import { BuildDefinitionActionsCreator } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/BuildDefinitionActionsCreator";
import { INavigationView } from "CIWorkflow/Scripts/Scenarios/Definition/Common";
import { DefinitionTabsContainer } from "CIWorkflow/Scripts/Scenarios/Definition/Components/DefinitionTabsContainer";
import { BuildDefinitionSource } from "CIWorkflow/Scripts/Scenarios/Definition/Sources/BuildDefinitionSource";
import { BuildDefinitionStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/BuildDefinitionStore";
import { CoreDefinitionStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/CoreDefinitionStore";
import { getPermissionsStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/Permissions";

import { ProcessType, BuildSecurity, BuildPermissions } from "Build.Common/Scripts/Generated/TFS.Build2.Common";
import { getDefinitionSecurityToken } from "Build.Common/Scripts/Security";

import * as TaskUtils from "DistributedTasksCommon/TFS.Tasks.Utils";

import { MessageHandlerActions, IAddMessagePayload } from "DistributedTaskControls/Actions/MessageHandlerActions";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { STRING_BACKSLASH } from "DistributedTaskControls/Common/Common";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";
import { Component as InformationBar } from "DistributedTaskControls/Components/InformationBar";
import { Component as MarkdownRenderer } from "DistributedTaskControls/Components/MarkdownRenderer";
import * as DTCResources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { Title } from "DistributedTaskControls/SharedControls/TitleBar/TitleBar";
import { SaveStatusStore } from "DistributedTaskControls/Stores/SaveStatusStore";

import { Fabric } from "OfficeFabric/components/Fabric/Fabric";

import { DefinitionQuality, BuildDefinition as ContractsBuildDefinition } from "TFS/Build/Contracts";

import * as VssContext from "VSS/Context";
import { BaseControl } from "VSS/Controls";
import * as KeyboardShortcuts_LAZY_LOAD from "VSS/Controls/KeyboardShortcuts";
import * as Diag from "VSS/Diag";
import * as Events_Document from "VSS/Events/Document";
import * as Navigation_Service from "VSS/Navigation/Services";
import * as Utils_String from "VSS/Utils/String";
import * as VSS from "VSS/VSS";

import "VSS/LoaderPlugins/Css!CIWorkflow/Scripts/Scenarios/Definition/BuildDefinitionView";

export interface IDefinition extends INavigationView {
    create(templateId: string, path?: string): void;
    edit(id: number): void;
    clone(id: number): void;
}

export interface IBuildDefinitionControllerViewOptions extends Base.IProps {
    quality?: DefinitionQuality;
}

export class BuildDefinitionControllerView extends Base.Component<IBuildDefinitionControllerViewOptions, Base.IState> {
    private _saveStatusStore: SaveStatusStore;
    private _actionCreator: BuildDefinitionActionsCreator;

    constructor(props: IBuildDefinitionControllerViewOptions) {
        super(props);
        this._actionCreator = ActionCreatorManager.GetActionCreator<BuildDefinitionActionsCreator>(BuildDefinitionActionsCreator);
        this._saveStatusStore = StoreManager.GetStore<SaveStatusStore>(SaveStatusStore);
    }

    public componentWillMount() {
        this._saveStatusStore.addChangedListener(this._handleSaveStatusChange);
    }

    public componentWillUnmount() {
        this._saveStatusStore.removeChangedListener(this._handleSaveStatusChange);
    }

    public render(): JSX.Element {
        Diag.logVerbose("[BuildDefinitionControllerView.render]: Method called.");

        return (
            <Fabric>
                {/*/ Fabric handles the application of is-focusVisible class which allows styling for focus on components.
                     It adds the class if keyboard is being used and removes if mouse is used.*/}
                <div className="definition">
                    <div className="main">
                        <div className="head">
                            <Title
                                store={StoreManager.GetStore<CoreDefinitionStore>(CoreDefinitionStore)}
                                editable={true}
                                ariaLabel={Resources.BuildDefinitionName}
                                iconName={"bowtie-build"}
                                onChanged={this._onBuildDefinitionNameChanged}
                                nameInvalidMessage={this._getInvalidDefinitionMessage}
                                disabled={DefinitionUtils.isDraftDefinition(this.props.quality)}
                                displayBreadcrumb={true}
                                getBreadcrumbLink={this._getDefaultBreadcrumbUrlForFolder}
                                rootFolderName={Resources.BuildDefinitions}
                            />
                        </div>
                        <InformationBar cssClass="build-message-bar" parentKey={ErrorMessageParentKeyConstants.Main} onMessageBarDisplayToggle={this._onMessageBarDisplayToggle} />
                        <div className="body"
                            role="region"
                            aria-label={Resources.ARIALabelEditorTabs}>
                            <DefinitionTabsContainer quality={this.props.quality} />
                        </div>
                    </div>
                </div>
            </Fabric>
        );
    }

    public refresh(): void {
        this.setState(this.state);
    }

    private _getInvalidDefinitionMessage = (name: string) => {
        if (!name) {
            return DTCResources.EditDefinitionNameInvalidTitle;
        }
        else
            if (!DefinitionUtils.isDefinitionNameValid(name)) {
                return DTCResources.SpecialCharactersNotAllowedErrorMessage;
            }
            else {
                return Utils_String.empty;
            }
    }

    private _onBuildDefinitionNameChanged = (name: string) => {
        this._actionCreator.changeName(name);
    }

    private _handleSaveStatusChange = () => {
        // This is done intentionally to ensure that the current view is refreshed only once when the save completes instead
        // of update from each store refreshing the same view again and again.
        if (this._saveStatusStore.hasSaveCompleted()) {
            this.refresh();
        }
    }

    private _onMessageBarDisplayToggle = (isVisible: boolean): void => {
        let bodyElement = (ReactDOM.findDOMNode(this) as Element).getElementsByClassName("body")[0];
        if (isVisible) {
            bodyElement.classList.add("afterMessage");
        }
        else {
            bodyElement.classList.remove("afterMessage");
        }
    }

    private _getDefaultBreadcrumbUrlForFolder(path: string) {
        let urlState = Navigation_Service.getHistoryService().getCurrentState();
        let action = "allDefinitions";
        // honor context only if user clicks on root breadcrumb, if it's folder, it should goto default all definitions action
        if (path === STRING_BACKSLASH && urlState && urlState.context) {
            action = urlState.context;
        }

        let routeData = {
            _a: action,
            path: path
        };

        return TaskUtils.ActionUrlResolver.getActionUrl(Utils_String.empty, "index", "build", routeData);
    }
}

export class BuildDefinition extends BaseControl implements IDefinition {
    private _actionCreator: BuildDefinitionActionsCreator;
    private _store: BuildDefinitionStore;
    private _buildDefinitionEditorEntry: Events_Document.RunningDocumentsTableEntry;
    private _messageHandlerActions: MessageHandlerActions;
    private _buildDefinitionControllerView: BuildDefinitionControllerView;
    private _keyboardShortcutManager: KeyboardShortcuts_LAZY_LOAD.IShortcutManager;

    public initialize(): void {
        this._actionCreator = ActionCreatorManager.GetActionCreator<BuildDefinitionActionsCreator>(BuildDefinitionActionsCreator);
        this._store = StoreManager.GetStore<BuildDefinitionStore>(BuildDefinitionStore);
        this._buildDefinitionEditorEntry = Events_Document.getRunningDocumentsTable().add("BuildDefinitionEditor", this);
        this._messageHandlerActions = ActionsHubManager.GetActionsHub<MessageHandlerActions>(MessageHandlerActions);
        this._registerShortcuts();
    }

    public isDirty(): boolean {
        const definition = this._store.getBuildDefinition();
        if (definition) {
            const projectId = VssContext.getDefaultWebContext().project.id;
            let token: string = projectId;


            const isExistingDefinition: boolean = definition.id > 0;

            if (isExistingDefinition || (definition.path && definition.path !== DefaultPath)) {
                token = getDefinitionSecurityToken(projectId, definition.path, definition.id);
            }
        

            const isReadOnly = !getPermissionsStore().hasPermission(token, BuildPermissions.EditBuildDefinition);

            if (isReadOnly) {
                // if we're viewing the page in read-only mode, there's no point in preventing the user from navigating away
                return false;
            }
        }

        return this._store.isDirty();
    }

    public create(templateId: string, path?: string, repositoryName?: string, repositoryType?: string, initialTriggers?: string): IPromise<void> {
        return this._executeAsyncAction(() => { return this._createDefinition(templateId, path, repositoryName, repositoryType, initialTriggers); });
    }

    public edit(id: number): IPromise<void> {
        return this._executeAsyncAction(() => { return this._editDefinition(id); });
    }

    public clone(id: number): IPromise<void> {
        return this._executeAsyncAction(() => { return this._cloneDefinition(id); });
    }

    public refreshViewAfterLoad(): void {
        this.getElement().removeClass("ci-loading");
        if (this._buildDefinitionControllerView) {
            this._buildDefinitionControllerView.refresh();
        }
    }

    public import(): IPromise<void> {
        return this._executeAsyncAction(() => { return this._importDefinition(); });
    }

    public canNavigateAway(): boolean {
        if (this._store.isDirty()) {
            return confirm(Resources.BuildDefinitionNavigateAwayWhenDirtyMessage);
        }
        else {
            return true;
        }
    }

    public dispose() {
        if (this.getElement()) {
            ReactDOM.unmountComponentAtNode(this.getElement()[0]);
        }

        this._unregisterShortcuts();
        super.dispose();
        StoreManager.dispose();
        ActionCreatorManager.dispose();
        ActionsHubManager.dispose();
    }

    private _createDefinition(templateId: string, path?: string, repositoryName?: string, repositoryType?: string, initialTriggers?: string): IPromise<void> {
        this._createView();
        return this._actionCreator.createBuildDefinition(templateId, path, repositoryName, repositoryType, initialTriggers);
    }

    private _cloneDefinition(id: number): IPromise<void> {
        this._createView();
        return this._actionCreator.cloneBuildDefinition(id);
    }

    private _importDefinition(): IPromise<void> {
        this._createView();
        let definition = sessionStorage.getItem(ImportConstants.ImportStorageKey);
        if (definition) {
            try {
                let jsonDefinition = JSON.parse(definition);
                let buildDefinitionToImport = jsonDefinition as ContractsBuildDefinition;
                if (!buildDefinitionToImport) {
                    throw new Error(Resources.ImportErrorContent);
                }
                if (buildDefinitionToImport.process && buildDefinitionToImport.process.type === ProcessType.Yaml)
                {
                    throw new Error(Resources.ImportErrorYaml);
                }
                
                return this._actionCreator.importBuildDefinition(buildDefinitionToImport);
            }
            catch (ex) {
                this._createErrorBar(ex.message);
                return Q.reject<void>(ex.message);
            }
        }
        else {
            this._createErrorBar(Resources.ImportErrorContent);
            return Q.reject<void>(Resources.ImportErrorContent);
        }
    }

    private _editDefinition(id: number): IPromise<void> {
        return BuildDefinitionSource.instance().getDefinitionQuality(id).then((quality: DefinitionQuality) => {
            this._createView(quality);
            return this._actionCreator.editBuildDefinition(id);
        }, (error) => {
            this._createErrorBar(error);
            return Q.reject(error);
        });
    }

    private _createView(definitionQuality?: DefinitionQuality): void {
        this._buildDefinitionControllerView = ReactDOM.render(React.createElement(BuildDefinitionControllerView, { quality: definitionQuality }),
            this.getElement()[0]);

        // Do a dummy markdown render so that the required modules for markdown are available.
        MarkdownRenderer.marked("markdown-preload-helper");
    }

    private _executeAsyncAction(action: () => IPromise<void>): IPromise<void> {
        this.getElement().addClass("ci-loading");
        return action();
    }

    private _createErrorBar(error: any) {
        ReactDOM.render(React.createElement(InformationBar, {
            cssClass: "build-message-bar",
            parentKey: ErrorMessageParentKeyConstants.Main
        }), this.getElement()[0]);

        this._messageHandlerActions.addMessage.invoke({
            parentKey: ErrorMessageParentKeyConstants.Main,
            message: (error.message || error),
            statusCode: error.status
        } as IAddMessagePayload);
    }

    private _registerShortcuts() {
        VSS.using(["VSS/Controls/KeyboardShortcuts"], (KeyboardShortcutsModule: typeof KeyboardShortcuts_LAZY_LOAD) => {
            this._keyboardShortcutManager = KeyboardShortcutsModule.ShortcutManager.getInstance();

            this._keyboardShortcutManager.registerShortcut(
                DTCResources.EditorShortKeyGroup,
                KeyboardShortcutsModule.ShortcutKeys.CONTROL + "+s",
                {
                    description: Resources.KeyboardShortcutSaveBuildDefinitionDescription,
                    action: () => {
                        // Blur the current element to trigger any validation/saving
                        const activeElement = document.activeElement as HTMLElement;
                        if (activeElement && activeElement.blur) {
                            activeElement.blur();
                        }

                        if (this._store.isDirty() && this._store.isValid()) {
                            this._actionCreator.showSaveDialog();
                        }
                        else {
                            // Nothing to save, so re-focus the element to avoid annoying the user
                            if (activeElement && activeElement.focus) {
                                activeElement.focus();
                            }
                        }
                    },
                    element: document.body
                });

            DtcUtils.registertShortcuts();
        });
    }

    private _unregisterShortcuts() {
        if (this._keyboardShortcutManager) {
            VSS.using(["VSS/Controls/KeyboardShortcuts"], (KeyboardShortcutsModule: typeof KeyboardShortcuts_LAZY_LOAD) => {
                this._keyboardShortcutManager.unRegisterShortcut(DTCResources.EditorShortKeyGroup, KeyboardShortcutsModule.ShortcutKeys.CONTROL + "+s");
                DtcUtils.unregisterShortcuts();
            });
        }
    }
}
