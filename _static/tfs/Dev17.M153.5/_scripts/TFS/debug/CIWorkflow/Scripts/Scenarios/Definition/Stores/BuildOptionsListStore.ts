import { RepositoryTypes } from "Build.Common/Scripts/Generated/TFS.Build2.Common";

import { OptionsUtilities } from "CIWorkflow/Scripts/Common/OptionsUtilities";
import { BuildDefinitionActions, IToggleBuildOptionActionPayload } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/BuildDefinitionActions";
import { BuildDefinitionStoreKeys } from "CIWorkflow/Scripts/Scenarios/Definition/Common";
import * as WebPageData from "CIWorkflow/Scripts/Scenarios/Definition/Sources/WebPageData";
import { Store } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/Base";
import { CoreDefinitionStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/CoreDefinitionStore";
import { BuildOptionStore, IBuildOptionStoreArgs } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/BuildOptionStore";
import { SourcesSelectionStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/SourcesSelectionStore";

import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import { BuildDefinition, BuildOption, BuildOptionDefinition, BuildOptionDefinitionReference, BuildOptionInputDefinition } from "TFS/Build/Contracts";

import { ProjectVisibility } from "TFS/Core/Contracts";

import * as Utils_String from "VSS/Utils/String";

export interface IBuildOptionsListState {
    buildOptionsList: BuildOption[];
    oldBadgeUrl?: string;
}

export class BuildOptionsListStore extends Store {
    private readonly _autoLinkingBuildOptionId: string = "5d58cc01-7c75-450c-be18-a388ddb129ec";
    private _currentState: IBuildOptionsListState;
    private _originalState: IBuildOptionsListState;
    private _buildDefinitionActions: BuildDefinitionActions;
    private _optionStoreMap: IDictionaryStringTo<BuildOptionStore>;
    private _optionDefinitionList: BuildOptionDefinition[];

    constructor() {
        super();
        this._currentState = { buildOptionsList: null, oldBadgeUrl: Utils_String.empty };
        this._originalState = { buildOptionsList: null, oldBadgeUrl: Utils_String.empty };
        this._optionStoreMap = {};
    }

    public initialize(): void {
        this._buildDefinitionActions = ActionsHubManager.GetActionsHub<BuildDefinitionActions>(BuildDefinitionActions);
        this._buildDefinitionActions.createBuildDefinition.addListener(this._handleCreateAndUpdateBuildDefinition);
        this._buildDefinitionActions.updateBuildDefinition.addListener(this._handleCreateAndUpdateBuildDefinition);
        this._buildDefinitionActions.toggleBuildOption.addListener(this._handleToggleBuildOption);

        this._buildDefinitionActions.changeBadgeEnabled.addListener(this._handleChangeBadgeEnabled);
    }

    protected disposeInternal(): void {
        this._buildDefinitionActions.createBuildDefinition.removeListener(this._handleCreateAndUpdateBuildDefinition);
        this._buildDefinitionActions.updateBuildDefinition.removeListener(this._handleCreateAndUpdateBuildDefinition);
        this._buildDefinitionActions.toggleBuildOption.removeListener(this._handleToggleBuildOption);

        this._buildDefinitionActions.changeBadgeEnabled.removeListener(this._handleChangeBadgeEnabled);

        this._deleteStoresFromMap();
        this._optionStoreMap = null;
    }

    public static getKey(): string {
        return BuildDefinitionStoreKeys.StoreKey_BuildOptionsListStore;
    }

    public getState(): IBuildOptionsListState {
        return this._currentState;
    }

    public isDirty(): boolean {
        let isDirty = false;
        if (!this._currentState.buildOptionsList && !this._originalState.buildOptionsList) {
            return false;
        }
        else if (!this._currentState.buildOptionsList || !this._originalState.buildOptionsList) {
            return true;
        }

        const length = this._currentState.buildOptionsList.length;
        for (let index = 0; index < length; index++) {
            if (this._currentState.buildOptionsList[index].enabled !== this._originalState.buildOptionsList[index].enabled) {
                isDirty = true;
                break;
            }
        }
        if (!isDirty) {
            for (const optionKey in this._optionStoreMap) {
                if (this._optionStoreMap.hasOwnProperty(optionKey)) {
                    if (this._optionStoreMap[optionKey].isDirty()) {
                        isDirty = true;
                        break;
                    }
                }
            }
        }

        return isDirty;
    }

    public isValid(): boolean {
        let isValid = true;
        for (const optionKey in this._optionStoreMap) {
            if (this._optionStoreMap.hasOwnProperty(optionKey)) {
                if (this._currentState.buildOptionsList && this._currentState.buildOptionsList.length > 0) {
                    const buildOption = this._currentState.buildOptionsList.filter((option: BuildOption) => {
                        return Utils_String.ignoreCaseComparer(option.definition.id, optionKey) === 0;
                    })[0];
                    if (buildOption && buildOption.enabled && !this._optionStoreMap[optionKey].isValid()) {
                        isValid = false;
                        break;
                    }
                }
            }
        }

        return isValid;
    }

    /**
     * Check if the current build option is visible/should be rendered on the options page. Default is true
     * @returns False if option should be hidden. Default true.
     */
    public isBuildOptionVisible(buildOptionDef: BuildOptionDefinition): boolean {
        if (Utils_String.equals(buildOptionDef.id, this._autoLinkingBuildOptionId, true)) {
            const sourcesSelectionStore = StoreManager.GetStore<SourcesSelectionStore>(SourcesSelectionStore);
            const repositoryType = sourcesSelectionStore.getBuildRepository().type || Utils_String.empty;

            return Utils_String.equals(repositoryType, RepositoryTypes.TfsGit, true) ||
                Utils_String.equals(repositoryType, RepositoryTypes.TfsVersionControl, true);
        }
        return true;
    }

    public updateVisitor(buildDefinition: BuildDefinition): BuildDefinition {
        if (this._currentState.buildOptionsList) {
            buildDefinition.options = [];
            for (let option of this._currentState.buildOptionsList) {
                let mapKey = this._getMapKey(option.definition.id);
                if (this._optionStoreMap.hasOwnProperty(mapKey)) {
                    let buildOption = this._optionStoreMap[mapKey].getBuildOption();
                    buildOption.enabled = option.enabled;
                    buildDefinition.options.push(buildOption);
                }
                else {
                    buildDefinition.options.push(option);
                }
            }
        }
        return buildDefinition;
    }

    public getStores(): BuildOptionStore[] {
        let storeList: BuildOptionStore[] = null;
        for (let optionKey in this._optionStoreMap) {
            if (this._optionStoreMap.hasOwnProperty(optionKey)) {
                storeList.push(this._optionStoreMap[optionKey]);
            }
        }
        return storeList;
    }

    public getBuildOptionDefinitions(): BuildOptionDefinition[] {
        return this._optionDefinitionList;
    }

    public getBuildOptionDefinition(id: string): BuildOptionDefinition {
        if (!this._optionDefinitionList) {
            return null;
        }
        return this._optionDefinitionList.filter((buildOptionDef: BuildOptionDefinition) => {
            return Utils_String.ignoreCaseComparer(buildOptionDef.id, id) === 0;
        })[0];
    }

    private _getBadgeUrl(buildDefinitionId: number): string {
        if (buildDefinitionId > 0) {
            const tfsContext = TfsContext.getDefault();
            const hostUrl = tfsContext.getHostUrl();
            const collectionPath = tfsContext.getServiceHostUrl();
            return hostUrl + collectionPath + DefinitionsAPIPath + tfsContext.navigation.projectId + "/" + buildDefinitionId + "/" + BadgeResourceName;
        }

        return Utils_String.empty;
    }

    private _handleChangeBadgeEnabled = (badgeEnabled: boolean) => {
        const coreDefinitionStore = StoreManager.GetStore<CoreDefinitionStore>(CoreDefinitionStore);
        const buildDefinitionId = coreDefinitionStore.getState().id;
        if (badgeEnabled) {
            this._currentState.oldBadgeUrl = this._getBadgeUrl(buildDefinitionId);
            this.emitChanged();
        }
    }

    private _handleCreateAndUpdateBuildDefinition = (definition: BuildDefinition) => {
        this._updateStateFromBuildDefinition(definition);

        // updating badge url
        if (definition) {
            let badgeUrl: string = Utils_String.empty;
            const links = definition._links;
            if (links && links.badge && links.badge.href) {
                badgeUrl = links.badge.href.toString();
            }
            else if (definition.project && definition.project.visibility === ProjectVisibility.Public) {
                badgeUrl = this._getBadgeUrl(definition.id);
            }
            this._currentState.oldBadgeUrl = badgeUrl;
        }

        this.emitChanged();
    }

    private _handleToggleBuildOption = (toggleBuildOptionActionPayload: IToggleBuildOptionActionPayload) => {
        if (this._currentState.buildOptionsList && this._currentState.buildOptionsList.length > 0) {
            let buildOptionToBeToggle = this._currentState.buildOptionsList.filter((buildOption: BuildOption) => {
                return Utils_String.ignoreCaseComparer(buildOption.definition.id, toggleBuildOptionActionPayload.key) === 0;
            })[0];
            if (buildOptionToBeToggle) {
                buildOptionToBeToggle.enabled = toggleBuildOptionActionPayload.value;
            }
            this.emitChanged();
        }
    }

    private _updateStateFromBuildDefinition(buildDefinition: BuildDefinition) {
        this._optionDefinitionList = WebPageData.WebPageDataHelper.getBuildOptionDefinitions();

        if (!(this._optionDefinitionList && this._optionDefinitionList.length > 0)) {
            // clean up if no definitions found
            this._deleteStoresFromMap();
            this._updateStates([]);
            return;
        }

        let buildOptions: BuildOption[] = buildDefinition.options || [];

        this._optionDefinitionList.forEach((optionDef: BuildOptionDefinition) => {
            let matchingOptions = buildOptions.filter((option: BuildOption) => {
                return Utils_String.ignoreCaseComparer(option.definition.id, optionDef.id) === 0;
            });

            let buildOption: BuildOption;

            if (!matchingOptions || matchingOptions.length !== 1) {
                buildOption = this._getOptionWithDefaultValues(optionDef);
                buildOptions.push(buildOption);
            }
            else {
                buildOption = matchingOptions[0];
            }

            // create new store for build option if not already created and option has inputs
            let mapKey = this._getMapKey(optionDef.id);
            if (!this._optionStoreMap[mapKey] && optionDef.inputs && optionDef.inputs.length > 0) {
                this._optionStoreMap[mapKey] = this._createStoreForOption(optionDef, buildOption);
            }
        });

        this._cleanupStoresForRemovedOptionDefinitionsFromMap();

        this._updateStates(buildOptions);
    }

    private _getOptionWithDefaultValues(buildOptionDef: BuildOptionDefinition): BuildOption {
        let def = {
            id: buildOptionDef.id
        } as BuildOptionDefinitionReference;

        let inputs: IDictionaryStringTo<string> = {};
        buildOptionDef.inputs.forEach((input: BuildOptionInputDefinition) => {
            inputs[input.name] = input.defaultValue;
        });

        return {
            definition: def,
            enabled: false,
            inputs: inputs
        } as BuildOption;
    }

    private _createStoreForOption(optionDef: BuildOptionDefinition, option: BuildOption) {
        let store = StoreManager.CreateStore<BuildOptionStore, IBuildOptionStoreArgs>(
            BuildOptionStore,
            optionDef.id,
            {
                buildOption: option,
                buildOptionDefinition: optionDef
            }
        );
        store.addChangedListener(this._handleOptionsChange);
        return store;
    }

    private _cleanupStoresForRemovedOptionDefinitionsFromMap() {
        // handle removed build option
        for (let optionKey in this._optionStoreMap) {
            if (this._optionStoreMap.hasOwnProperty(optionKey)) {
                let matchingOptionDef = this._optionDefinitionList.filter((buildOptionDef: BuildOptionDefinition) => {
                    return Utils_String.ignoreCaseComparer(buildOptionDef.id, optionKey) === 0;
                });
                if (!(matchingOptionDef && matchingOptionDef.length > 0)) {
                    this._deleteStoreFromMap(optionKey);
                }
            }
        }
    }

    private _deleteStoresFromMap() {
        for (let optionKey in this._optionStoreMap) {
            if (this._optionStoreMap.hasOwnProperty(optionKey)) {
                this._deleteStoreFromMap(optionKey);
            }
        }
    }

    private _deleteStoreFromMap(optionId: string) {
        let mapKey = this._getMapKey(optionId);
        this._optionStoreMap[mapKey].removeChangedListener(this._handleOptionsChange);
        StoreManager.DeleteStore<BuildOptionStore>(BuildOptionStore, optionId);
        delete this._optionStoreMap[mapKey];
    }

    private _handleOptionsChange = () => {
        this.emitChanged();
    }

    private _updateStates(buildOptionsList: BuildOption[]) {
        this._updateState(this._originalState, buildOptionsList);
        this._updateState(this._currentState, buildOptionsList);
    }

    private _updateState(state: IBuildOptionsListState, buildOptionsList: BuildOption[]): void {
        state.buildOptionsList = buildOptionsList ? buildOptionsList.map((buildOption: BuildOption) => { return OptionsUtilities.createBuildOptionCopy(buildOption); }) : null;
    }

    private _getMapKey(optionId: string): string {
        return optionId.toLowerCase();
    }
}

const BadgeResourceName = "badge";
const DefinitionsAPIPath = "_apis/public/build/definitions/";
