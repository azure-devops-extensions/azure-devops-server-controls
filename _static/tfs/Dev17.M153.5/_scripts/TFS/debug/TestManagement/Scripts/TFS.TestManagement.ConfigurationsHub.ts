import q = require("q");
import ko = require("knockout");
import ksb = require("knockoutSecureBinding");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import { SidebarSearch } from "Presentation/Scripts/TFS/TFS.UI.Controls.SidebarSearch";
import Resources = require("TestManagement/Scripts/Resources/TFS.Resources.TestManagement");
import Controls = require("VSS/Controls");
import Contracts = require("TFS/TestManagement/Contracts");
import ConfigView = require("TestManagement/Scripts/TFS.TestManagement.ConfigurationView");
import VariableView = require("TestManagement/Scripts/TFS.TestManagement.VariableView");
import DefinitionTree = require("TestManagement/Scripts/TFS.TestManagement.Configurations.DefinitionTree");
import Events_Document = require("VSS/Events/Document");
import Menus = require("VSS/Controls/Menus");
import Navigation = require("VSS/Controls/Navigation");
import Navigation_Services = require("VSS/Navigation/Services");
import TCM_Client = require("TFS/TestManagement/RestClient");
import TestsOM = require("TestManagement/Scripts/TFS.TestManagement");
import TMUtils = require("TestManagement/Scripts/TFS.TestManagement.Utils");
import TCMTelemetry = require("TestManagement/Scripts/TFS.TestManagement.Telemetry");
import Utils_Accessibility = require("VSS/Utils/Accessibility");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import VSS = require("VSS/VSS");
import Utils_UI = require("VSS/Utils/UI");

let TfsContext = TFS_Host_TfsContext.TfsContext;
let delegate = Utils_Core.delegate;
let TelemetryService = TCMTelemetry.TelemetryService;
let options = { attribute: "data-bind", globals: window, bindings: ko.bindingHandlers, noVirtualElements: false };
ko.bindingProvider.instance = new ksb(options);

export class ConfigurationsHubExplorerView extends Navigation.NavigationView {

    private _views: IConfigurationHubViews;
    private _currentView: any;
    private _$rightPane: JQuery;
    private _$leftPane: JQuery;
    private _testConfigurationsSearchbarElement: JQuery;
    private _testConfigurationsSearch: TestConfigurationsSearchControl;
    private _collectionHttpTcmClient: TCM_Client.TestHttpClient;

    private _allConfigurations: Contracts.TestConfiguration[] = [];
    private _allTestVariables: Contracts.TestVariable[] = [];        
    private _configurationsManager: TestsOM.TestConfigurationManager;
    private _tabs: Navigation.PivotView;    
    
    //tabs
    private _hubContent: any;
    private _tabsControl: Navigation.PivotView;

    //for tree control
    private _definitionTree: DefinitionTree.ConfigurationDefinitionExplorerTab;
    private _definitionSelectionActionDelegate: any;
    private _definitionDeleteActionDelegate: any;
    private _selectedDefinition: KnockoutObservable<DefinitionTree.ConfigurationDefinitionModel>;

    //Error handling
    private DeletedDefinitionError: number = 404;

    constructor(options?) {
        super($.extend({
            hubContentCss: ".configurations-hub-right-pane-content",
            pivotTabsCss: ".configurations-hub-view-tabs"
        }, options));

        this._configurationsManager = TMUtils.getTestConfigurationManager();       
        this._definitionSelectionActionDelegate = delegate(this, this._definitionSelectedAction);
        this._definitionDeleteActionDelegate = delegate(this, this._definitionDeletedAction);
        this._selectedDefinition = DefinitionTree.definitionContext.selectedDefinition;
        TelemetryService.publishEvents(TelemetryService.featureConfigurationsHub, {});
    }

    public initialize() {       
        
        super.initialize();
        
        this._$leftPane = this.getElement().find(".configurations-view-explorer");
        this._initializeLeftPaneControls();

        this._tabsControl = <Navigation.PivotView>Controls.Enhancement.ensureEnhancement(Navigation.PivotView, this._element.find(this._options.pivotTabsCss));

        this._hubContent = this._element.find(this._options.hubContentCss);
        this._initializeViews(); 
        this._InitializeNavigation(true);  
        
        this._bind("saveOrRefreshDefinition", delegate(this, this._onSaveOrRefreshDefinition));
        this._bind("deleteDefinition", delegate(this, this._onDeleteDefinition));

        this._getDataAndPopulateControls();      

        $(window).bind("beforeunload", delegate(this, this._getMessage, true));

        $(document).keydown(delegate(this, this._onKeyDown));           
    }
    
    public _getMessage(forUnload?: boolean) {
        let message: string;
        if (this._currentView && this._currentView.isDirty()) {
            let runningDocumentsTable = Events_Document.getRunningDocumentsTable();
            if (runningDocumentsTable.isModified(null)) {
                message = runningDocumentsTable.getUnsavedItemsMessage();
                if (!forUnload) {
                    message = message + "\r\n\r\n" + Resources.ContinueAndLoseChanges;
                }
            }
            else {
                message = Resources.UnsavedChanges + " " + Resources.ContinueAndLoseChanges;
            }
        }
        return message;
    }

    public _getAllTestVariables(): Contracts.TestVariable[] {
        return this._allTestVariables;
    }

    private _onKeyDown(e?) {

        if (Utils_UI.KeyUtils.isExclusivelyCtrl(e) && (e.which == 83) //Ctrl + S
            && this._currentView) { 

            e.preventDefault();
            this._currentView.save();
        }    
    }

    private _onSaveOrRefreshDefinition(e, context) {

        let updatedVariable: Contracts.TestVariable = context.variable;
        let isNewVariable: boolean = context.isNewVariable;

        if (updatedVariable) {
            this._updateSelectedNodeWithLatestValue(updatedVariable.name, updatedVariable.id);

            if (isNewVariable === true) {
                this._allTestVariables.push(updatedVariable);
                this._allTestVariables = this._allTestVariables.sort((a, b) => Utils_String.localeIgnoreCaseComparer(a.name, b.name));
            }
            else {
                this._allTestVariables.forEach((value, index) => {
                    if (value.id === updatedVariable.id) {
                        this._allTestVariables[index] = updatedVariable;
                        return false;
                    }
                });
            }
        }
        else {
            //Configuration
            let updatedConfigurationName: string = context.configurationName;
            let updatedConfigurationId: number = context.configurationId;
            let config: Contracts.TestConfiguration = context.configuration;

            if (updatedConfigurationName) {
                if (updatedConfigurationId > 0) {
                    this._allConfigurations.push(config);
                    this._allConfigurations = this._allConfigurations.sort((a, b) => Utils_String.localeIgnoreCaseComparer(a.name, b.name));
                }
                this._updateSelectedNodeWithLatestValue(updatedConfigurationName, updatedConfigurationId);
                this._updateAllConfigurationsCache(false, updatedConfigurationId, updatedConfigurationName);
            }
        } 
    }

    private _onDeleteDefinition(e, context) {
    
        let definitionId: number = context.definitionId;
        
        if (this._selectedDefinition().definitionType === DefinitionTree.DefinitionsType.configDefinition) {
            this._configDeletedAction(definitionId, false);
        }
        else {
            this._variableDeletedAction(definitionId, false);
        }        
    }

    //Set up views for navigation
    private _initializeViews() {

        let navigated = false;

        this._views = {
            testConfigurationViewWrapper: new TestConfigurationViewWrapper(),
            testVariableViewWrapper: new TestVariableViewWrapper()
        };        
    }

    private _InitializeNavigation(isInitilization: boolean): void {
        let historySvc = Navigation_Services.getHistoryService();
        let state = historySvc.getCurrentState();
        this._tabs = <Navigation.PivotView>Controls.Enhancement.ensureEnhancement(Navigation.PivotView);
        historySvc.attachNavigate((sender, state) => {
            this._navigate(state);
        });
    }

    private _navigate(state: any) {
        if (this._confirmUserForUnsavedData()) {
            this._definitionTree.selectNode(null, true);
            this._definitionTree.UpdateNavigation();
            return;
        }
        let configurationId: number = parseInt(state.configurationId, 10);
        let variableId: number = parseInt(state.variableId, 10);
        //Navigate to corresponding config
        this._definitionTree.selectNodeById(configurationId, variableId);
        this._populateDataInRightPane();
    }

    private _getDataAndPopulateControls(): void {

        q.all([this._configurationsManager.beginGetTestConfigurations(), this._configurationsManager.beginGetTestVariables()]).then((response: any[]) => {
            this._allConfigurations = response[0];
            this._allTestVariables = response[1];

            if ( (this._allConfigurations && this._allConfigurations.length > 0) || (this._allTestVariables && this._allTestVariables.length > 0)) {
                //parse url
                let historySvc = Navigation_Services.getHistoryService();
                let state = historySvc.getCurrentState();
                let configurationId: number = parseInt(state.configurationId, 10);
                let variableId: number = parseInt(state.variableId, 10);
                this._populateDataInAllPanes(configurationId, variableId);
            }
            else {
                this._definitionTree.clearConfigs(DefinitionTree.DefinitionsType.configDefinition);
                this._definitionTree.clearConfigs(DefinitionTree.DefinitionsType.variableDefinition);
                this.setViewTitle(Resources.NoConfigurationFoundErrorText);                
            }
        })
            .fail((error) => {      
                //Todo: Instead of alert show banner      
                alert(error.message);
            });
    }    

    private _populateDataInAllPanes(configurationId: number = -1, variableId: number = -1): void {
        //sort the configuration as per name
        this._allConfigurations = this._allConfigurations.sort((a, b) => Utils_String.localeIgnoreCaseComparer(a.name, b.name));
        this._allTestVariables = this._allTestVariables.sort((a, b) => Utils_String.localeIgnoreCaseComparer(a.name, b.name));
        this._populateDataInLeftTreeControls(this._allConfigurations, this._allTestVariables, configurationId, variableId);
        this._populateDataInRightPane();
    }
    
    private _confirmUserForUnsavedData(): boolean {

        if (this._currentView === null || this._currentView === undefined) {
            return false;
        }

        let isCancel: boolean = true;
        if (!(this._currentView.isDirty() === true &&
            !confirm(Resources.DefinitionDirtyWindow_ConfirmMessage))) {
            this._currentView.clearDirtyState();
            isCancel = false;
        }
        return isCancel;
    }

    private _updateAllDefinitionsCache(isRemove: boolean, definitionId: number, title: string = "") {

        if (this._selectedDefinition().definitionType === DefinitionTree.DefinitionsType.configDefinition) {
            this._updateAllConfigurationsCache(isRemove, definitionId, title);
        }
        else {
            this._updateAllVariablesCache(isRemove, definitionId, title);
        }
    }

    //isRemove = true -> remove else update
    private _updateAllConfigurationsCache(isRemove: boolean, configId: number, title: string = "") {

        let allConfigurationsUpdated: Contracts.TestConfiguration[] = [];

        this._allConfigurations.forEach((config: Contracts.TestConfiguration) => {
            if (config.id !== configId) {
                allConfigurationsUpdated.push(config);
            }
            else {
                if (!isRemove) {
                    config.name = title;
                    allConfigurationsUpdated.push(config);
                }
            }
        });

        this._allConfigurations = allConfigurationsUpdated;
        this._allConfigurations = this._allConfigurations.sort((a, b) => Utils_String.localeIgnoreCaseComparer(a.name, b.name));
    }

    //isRemove = true -> remove else update
    private _updateAllVariablesCache(isRemove: boolean, variableId: number, title: string = "") {

        let allVariablesUpdated: Contracts.TestVariable[] = [];

        this._allTestVariables.forEach((variable: Contracts.TestVariable) => {
            if (variable.id !== variableId) {
                allVariablesUpdated.push(variable);
            }
            else {
                if (!isRemove) {
                    variable.name = title;
                    allVariablesUpdated.push(variable);
                }
            }
        });

        this._allTestVariables = allVariablesUpdated;
        this._allTestVariables = this._allTestVariables.sort((a, b) => Utils_String.localeIgnoreCaseComparer(a.name, b.name));
    }

    //right Pane control region start
    private _populateDataInRightPane() {
        if (this._selectedDefinition() !== null) {
            this._currentView = this._selectedDefinition().definitionType === DefinitionTree.DefinitionsType.configDefinition ? this._views.testConfigurationViewWrapper : this._views.testVariableViewWrapper;
            this._prepareCurrentViewOnViewSwitch();
            if (this._selectedDefinition().id() !== -1) {
                this._currentView.fetchDataAndPopulateControls(this._selectedDefinition().id(), this._allTestVariables).then((definition: any) => {
                    if (definition !== null && definition !== undefined) {
                        this._updateSelectedNodeWithLatestValue(definition.name);
                        this._updateAllDefinitionsCache(false, definition.id, definition.name);
                    }
                },
                    (error) => {
                        //TODO: SHYAM: Error handling
                    });
            }
            else {
                this._currentView.fetchDataAndPopulateControls(this._selectedDefinition().id(), this._allTestVariables);
            }
        }
        else {
            if (this._currentView) {
                this._currentView.hide();
            }
            this.setViewTitle(Resources.NoConfigurationFoundErrorText);    
        }
    }

    //right Pane control region end

    //Left Pane Controls region

    private _initializeLeftPaneControls() {
        this._createLeftPaneToolbar();
        this._createLeftPaneTreeControlForConfigList();
        this._createLeftPaneSearchContainer();
    }

    private _createLeftPaneToolbar() {
        <Menus.MenuBar>Controls.BaseControl.createIn(Menus.MenuBar, this._$leftPane.find(".left-toolbar"), {
            items: this._createLeftPaneMenubarItems(),
            executeAction: delegate(this, this._onLeftPaneToolbarItemClick),
        });
    }

    private _createLeftPaneMenubarItems(): any[] {

        let items: any[] = [];

        items.push({
            id: LeftPaneToolbarCommands.newTestDefinitionDropDown,
            title: Resources.NewTestConfiguration,
            showText: false,
            icon: "bowtie-icon bowtie-math-plus-heavy bowtie-icon-small",
            groupId: "actions",
            childItems: this._createNewDefintionSubMenuItems()
        });

        items.push({ separator: true });

        items.push({
            id: LeftPaneToolbarCommands.refreshTestConfigurations,            
            title: Resources.RefreshTestConfigurations,
            showText: false,
            icon: "bowtie-icon bowtie-navigate-refresh"
        });
        return items;
    }

    private _createNewDefintionSubMenuItems(): any[] {
        let items: any[] = [];

        items.push({
            id: LeftPaneToolbarCommands.newTestConfiguration,
            text: Resources.NewTestConfiguration,
            showText: true,
            icon: "bowtie-icon bowtie-math-plus-heavy bowtie-icon-small"
        });

        items.push({
            id: LeftPaneToolbarCommands.newTestVariable,
            text: Resources.NewTestVariable,
            showText: true,
            icon: "bowtie-icon bowtie-math-plus-heavy bowtie-icon-small"
        });

        return items;
    }

    private _createLeftPaneSearchContainer() {
        this._testConfigurationsSearchbarElement = $("<div />")
            .addClass("left-searchbar")
            .appendTo(this._$leftPane.find(".search-configuration-action-container"));

        this._testConfigurationsSearch = <TestConfigurationsSearchControl>Controls.BaseControl.createIn(TestConfigurationsSearchControl, this._testConfigurationsSearchbarElement, {
            definitionTree: this._definitionTree
        });
    }

    private _createLeftPaneTreeControlForConfigList() {
        // Ensure the existence of definition tree
        if (!this._definitionTree) {
            this._definitionTree = new DefinitionTree.ConfigurationDefinitionExplorerTab({
                definitionSelectedAction: this._definitionSelectionActionDelegate,
                definitionDeleteAction: this._definitionDeleteActionDelegate
            });
            ko.applyBindings(this._definitionTree, this.getElement().find(".configurations-list-explorer")[0]);
        }
        // Show definition tree
        this._definitionTree.visible(true);
    }

    private _setViewsVisibility() {

        if (this._selectedDefinition().definitionType === DefinitionTree.DefinitionsType.configDefinition) {
            this._views.testVariableViewWrapper.hide();
            this._views.testConfigurationViewWrapper.show();
        }
        else {
            this._views.testVariableViewWrapper.show();
            this._views.testConfigurationViewWrapper.hide();
        }
    }

    private _definitionSelectedAction(definition: DefinitionTree.DefinitionExplorerDefinitionTreeNode): void {
        //if user selects the same node again
        if (definition.value().id() === this._selectedDefinition().id() && definition.value().definitionType === this._selectedDefinition().definitionType) {
            this._definitionTree.selectNode(definition, true);
            return;
        }
        if (this._confirmUserForUnsavedData()) {
            this._definitionTree.selectNode(definition, true);
            return;
        }

        //select the node and populate in both pane
        this._definitionTree.selectNode(definition);

        this._currentView = this._selectedDefinition().definitionType === DefinitionTree.DefinitionsType.configDefinition ? this._views.testConfigurationViewWrapper : this._views.testVariableViewWrapper;
        
        this._prepareCurrentViewOnViewSwitch();

        this._currentView.fetchDataAndPopulateControls(this._selectedDefinition().id(), this._allTestVariables).then((definition: any) => {
            if (definition !== null && definition !== undefined) {
                this._updateSelectedNodeWithLatestValue(definition.name);
                this._updateAllConfigurationsCache(false, definition.id, definition.name); 

            }
        },
            (error) => { });
    }

    private _definitionDeletedAction(definition: DefinitionTree.DefinitionExplorerDefinitionTreeNode, args: JQueryEventObject): void {
        if (!confirm(Resources.DefinitionDelete_ConfirmMessage)) {
            this._definitionTree.selectNode(null, true);
            return;
        }
        if (definition.value().definitionType === DefinitionTree.DefinitionsType.configDefinition) {
            this._configDeletedAction(definition.value().id());
        }
        else if (definition.value().definitionType === DefinitionTree.DefinitionsType.variableDefinition) {
            this._variableDeletedAction(definition.value().id());
        }
    }

    private _configDeletedAction(definitionId: number, deleteFromServer: boolean = true) {
        if (this._selectedDefinition().definitionType === DefinitionTree.DefinitionsType.configDefinition &&
            definitionId === this._selectedDefinition().id() && this._confirmUserForUnsavedData()) {
            this._definitionTree.selectNode(null, true);
            return;
        }
        this._definitionTree.removeNewDefinitionNode(true);
        let nextSelectedConfigNodeId: number = 0;
        let nextSelectedVariableNodeId: number = 0;
        if (definitionId === this._selectedDefinition().id() || this._selectedDefinition().id() === -1) {
            //find next selected node id from the list
            nextSelectedConfigNodeId = this._getNextDefinationForSelection(false, DefinitionTree.DefinitionsType.configDefinition, definitionId);
            if (nextSelectedConfigNodeId === 0) {
                nextSelectedVariableNodeId = this._getNextDefinationForSelection(true, DefinitionTree.DefinitionsType.variableDefinition);
            }
        }
        else {
            if (this._selectedDefinition().definitionType === DefinitionTree.DefinitionsType.configDefinition) {
                nextSelectedConfigNodeId = this._selectedDefinition().id();
            }
            else {
                nextSelectedVariableNodeId = this._selectedDefinition().id();
            }
        }
        if (deleteFromServer && definitionId > 0) {
            this._configurationsManager.beginDeleteTestConfiguration(definitionId).then((a: any) => {
                this._updateAllConfigurationsCache(true, definitionId);
                this._definitionTree.refreshConfigurationDefinitions(this._allConfigurations, -1);
                this._definitionTree.selectNodeById(nextSelectedConfigNodeId, nextSelectedVariableNodeId);
            },
                (error) => {
                    alert(error.message);
                });
            TelemetryService.publishEvents(TelemetryService.featureDeleteTestConfiguration, {});
        }
        else {
            this._updateAllConfigurationsCache(true, definitionId);
            this._definitionTree.refreshConfigurationDefinitions(this._allConfigurations, -1);
            this._definitionTree.selectNodeById(nextSelectedConfigNodeId, nextSelectedVariableNodeId);
        }
    }
    
    private _variableDeletedAction(definitionId: number, deleteFromServer: boolean = true) {
        if (this._selectedDefinition().definitionType === DefinitionTree.DefinitionsType.variableDefinition &&
            definitionId === this._selectedDefinition().id() && this._confirmUserForUnsavedData()) {
            this._definitionTree.selectNode(null, true);
            return;
        }
        this._definitionTree.removeNewDefinitionNode(true);
        let nextSelectedConfigNodeId: number = 0;
        let nextSelectedVariableNodeId: number = 0;
        if (definitionId === this._selectedDefinition().id() || this._selectedDefinition().id() === -1) {
            //find next selected node id from the list
            nextSelectedVariableNodeId = this._getNextDefinationForSelection(false, DefinitionTree.DefinitionsType.variableDefinition, definitionId);
            if (nextSelectedVariableNodeId === 0) {
                nextSelectedConfigNodeId = this._getNextDefinationForSelection(true, DefinitionTree.DefinitionsType.configDefinition);
            }
        }
        else {
            if (this._selectedDefinition().definitionType === DefinitionTree.DefinitionsType.variableDefinition) {
                nextSelectedVariableNodeId = this._selectedDefinition().id();
            }
            else {
                nextSelectedConfigNodeId = this._selectedDefinition().id();
            }
        }
        if (deleteFromServer && definitionId > 0) {
            this._configurationsManager.beginDeleteTestVariable(definitionId).then((a: any) => {
                this._updateAllVariablesCache(true, definitionId);
                this._definitionTree.refreshVariableDefinitions(this._allTestVariables, -1);
                this._definitionTree.selectNodeById(nextSelectedConfigNodeId, nextSelectedVariableNodeId);
            },
                (error) => {
                    alert(error.message);
                });
            TelemetryService.publishEvents(TelemetryService.featureDeleteTestVariable, {});
        }
        else {
            this._updateAllVariablesCache(true, definitionId);
            this._definitionTree.refreshVariableDefinitions(this._allTestVariables, -1);
            this._definitionTree.selectNodeById(nextSelectedConfigNodeId, nextSelectedVariableNodeId);
        }
    }


    private _getNextDefinationForSelection(isDefault: boolean, definitionType: DefinitionTree.DefinitionsType, id: number = -1): number {

        let nextSelectedId: number = 0;
        let prevSelectedId: number = 0;
        let isDecidedNextDef: boolean = false;
        let isSavePrevDef: boolean = true;
        let isDefaultSelected: boolean = false;
        if (definitionType === DefinitionTree.DefinitionsType.configDefinition) {
            this._allConfigurations.forEach((config: Contracts.TestConfiguration) => {
                if (isDefault === true && isDefaultSelected === false) {
                    nextSelectedId = config.id;
                    isDecidedNextDef = false;
                    isSavePrevDef = false;
                    isDefaultSelected = true;
                }
                if (isDecidedNextDef === true) {
                    isDecidedNextDef = false;
                    isSavePrevDef = false;
                    nextSelectedId = config.id;
                }
                if (isDefault !== true && config.id === id && isDecidedNextDef === false) {
                    isDecidedNextDef = true;
                    isSavePrevDef = false;
                }
                if (isSavePrevDef === true) {
                    prevSelectedId = config.id;
                }

            });
        }
        else {
            this._allTestVariables.forEach((variable: Contracts.TestVariable) => {
                if (isDefault === true && isDefaultSelected === false) {
                    nextSelectedId = variable.id;
                    isDecidedNextDef = false;
                    isSavePrevDef = false;
                    isDefaultSelected = true;
                }
                if (isDecidedNextDef === true) {
                    isDecidedNextDef = false;
                    isSavePrevDef = false;
                    nextSelectedId = variable.id;
                }
                if (isDefault !== true && variable.id === id && isDecidedNextDef === false) {
                    isDecidedNextDef = true;
                    isSavePrevDef = false;
                }
                if (isSavePrevDef === true) {
                    prevSelectedId = variable.id;
                }
            });

        }
        if (nextSelectedId === 0 && prevSelectedId !== 0) {
            nextSelectedId = prevSelectedId;
        }
        return nextSelectedId;
    }


    private _updateSelectedNodeWithLatestValue(name: string, id: number = 0) {
    
        this._definitionTree.updateSelectedNode(name, id);
    }

    private _populateDataInLeftTreeControls(configurations: Contracts.TestConfiguration[], variables: Contracts.TestVariable[],
        configurationId: number = -1, variableId: number = -1) {
        
        //expecting input configs and variables in sorted order
        this._definitionTree.refresh(configurations, variables, configurationId, variableId);
    }

    private _onLeftPaneToolbarItemClick(e?: any) {

        let command = e.get_commandName();
        switch (e.get_commandName()) {

            case LeftPaneToolbarCommands.newTestConfiguration:
                this.createNewDefinition(DefinitionTree.DefinitionsType.configDefinition);
                break;

            case LeftPaneToolbarCommands.newTestVariable:
                this.createNewDefinition(DefinitionTree.DefinitionsType.variableDefinition);
                break;

            case LeftPaneToolbarCommands.refreshTestConfigurations:
                this.refreshAllDefinition();
                break;
        }
    }

    private createNewDefinition(definitionType: DefinitionTree.DefinitionsType) {
    
        if (this._confirmUserForUnsavedData()) {           
            return;
        }

        //Create new testconfiguration or variable
        let model: DefinitionTree.ConfigurationDefinitionModel = null;
        if (definitionType === DefinitionTree.DefinitionsType.configDefinition) {
            model = new DefinitionTree.ConfigurationDefinitionModel(-1, Resources.NewTestConfiguration, definitionType);
            this._currentView = this._views.testConfigurationViewWrapper;
        }
        else {
            model = new DefinitionTree.ConfigurationDefinitionModel(-1, Resources.NewTestVariable, definitionType);
            this._currentView = this._views.testVariableViewWrapper;
        }

        //reset the filters if any
        this._testConfigurationsSearch.clearSearchFromControl();
        
        // Add new definition
        this._definitionTree.addNewDefinitionNode(model);
        
        this._prepareCurrentViewOnViewSwitch();
        //TODO: handle for right pane properly
        this._currentView.fetchDataAndPopulateControls(this._selectedDefinition().id(), this._allTestVariables);
    }

    private _prepareCurrentViewOnViewSwitch() {
        this._currentView.initializeView(this, this._hubContent);
        this._setViewsVisibility();
    }

    private refreshAllDefinition() {
        if (this._confirmUserForUnsavedData()) {
            return;
        }

        //reset the filters if any
        this._testConfigurationsSearch.clearSearchFromControl();

        //fetch the data and initialise all panes
        this._getDataAndPopulateControls();
    }

    //Left Pane Controls region ends
}

class LeftPaneToolbarCommands {
    public static newTestDefinitionDropDown: string = "create-new-definition-dropdown-menu-item";
    public static newTestConfiguration: string = "create-new-test-configuration";
    public static newTestVariable: string = "create-new-test-variable";
    public static refreshTestConfigurations: string = "refresh-test-configurations";
    public static deleteTestConfiguration: string = "delete-test-configuration";        
}

export class TestConfigurationsSearchControl extends SidebarSearch {
    public definitionTree: DefinitionTree.ConfigurationDefinitionExplorerTab;

    constructor(options?) {
        super(options);
        if (options.definitionTree) {
            this.definitionTree = options.definitionTree;
        }
    }

    public getSearchWaterMarkText() {
        return Resources.SearchTestConfigurationsWatermark;
    }

    public initialize() {
        super.initialize();
    }

    public executeSearch(searchText) {
        if (this.definitionTree) {
            this.definitionTree.filterSections(searchText);

            Utils_Accessibility.announce(Resources.UpdatedConfigurationTree);
        }
    }
    public clearSearchFromControl() {
        this._input.val("");
        this._input.blur();
        this._changeSearchIcon(true);
        this.clearSearch();
    }

    public clearSearch() {
        if (this.definitionTree) {
            this.definitionTree.resetFilteredSections();
        }
    }
}

export interface IConfigurationHubViews {
    testConfigurationViewWrapper: TestConfigurationViewWrapper;
    testVariableViewWrapper: TestVariableViewWrapper;    
}

export interface IConfigurationsHubExplorerView {
    name: string;
    initializeView(explorerView: ConfigurationsHubExplorerView, $parentContainer: JQuery): void;    
    fetchDataAndPopulateControls(configurationId: number, allTestVariables: Contracts.TestVariable[]): IPromise<any>;
    isDirty(): boolean;
    clearDirtyState();
    show(): void;
    hide(): void;
    save(): void;
}

export class TestConfigurationViewWrapper implements IConfigurationsHubExplorerView {
    private isEnabled: boolean;
    private $container: JQuery;       
    private configurationView: ConfigView.TestConfigurationView;
    public name: string;

    public constructor() {
        this.name = "configurationTab";
    }

    public initializeView(explorerView: ConfigurationsHubExplorerView, $parentContainer: JQuery): void {
   
        if (!this.$container) {
            // Set/Create div container
            this.setContainer($parentContainer);
            // Instantiate view object
            this.configurationView = <ConfigView.TestConfigurationView>Controls.BaseControl.createIn(ConfigView.TestConfigurationView, this.$container, {
                _allTestVariables: explorerView._getAllTestVariables(),
            });
        }
    }

    public fetchDataAndPopulateControls(configurationId: number, allTestVariables: Contracts.TestVariable[]): IPromise<Contracts.TestConfiguration> {
        return this.configurationView._fetchAndPopulateDataInRightPaneControls(configurationId, allTestVariables);
    }
    
    public isDirty(): boolean {
        if (this.configurationView) {
            return this.configurationView.isDirty();
        }
        else {
            return false;
        }
    }

    public clearDirtyState() {
        if (this.configurationView) {
            this.configurationView._clearDirtyState();
        }
    }
    
    public show() {
        if (this.$container) {
            this.$container.show();
        }
    }

    public hide() {
        if (this.$container) {
            this.$container.hide();
        }
    }

    public save() {

        if (this.configurationView) {
            this.configurationView._save();
        }
    }

    private setContainer($parentContainer: JQuery): JQuery {

        if (this.$container === null || this.$container === undefined) {
            this.$container = $("<div />").addClass("viewContainer").appendTo($parentContainer);
        }
        this.$container.empty();
        return this.$container;
    }
}

VSS.initClassPrototype(TestConfigurationViewWrapper, {
    isEnabled: false,
    name: "configurationTab",
    configurationView: null
});

export class TestVariableViewWrapper implements IConfigurationsHubExplorerView {
    private isEnabled: boolean;
    private $container: JQuery;
    private variableView: VariableView.TestVariableView;
    public name: string;

    public constructor() {
        this.name = "variableTab";
    }

    public initializeView(explorerView: ConfigurationsHubExplorerView, $parentContainer: JQuery): void {

        if (!this.$container) {
            // Set/Create div container
            this.setContainer($parentContainer);
            // Instantiate view object
            this.variableView = <VariableView.TestVariableView>Controls.BaseControl.createIn(VariableView.TestVariableView, this.$container);
        }
    }

    public fetchDataAndPopulateControls(variableId: number, allTestVariables: Contracts.TestVariable[] = undefined): IPromise<Contracts.TestVariable> {
        return this.variableView._fetchAndPopulateDataInRightPaneControls(variableId);
    }

    public isDirty(): boolean {
        if (this.variableView) {
            return this.variableView.isDirty();
        }
        else {
            return false;
        }
    }

    public clearDirtyState() {
        if (this.variableView) {
            this.variableView._clearDirtyState();
        }
    }
    
    public show() {
        if (this.$container) {
            this.$container.show();
        }
    }

    public hide() {
        if (this.$container) {
            this.$container.hide();
        }
    }

    public save() {

        if (this.variableView) {
            this.variableView._save();
        }
    }

    private setContainer($parentContainer: JQuery): JQuery {

        if (this.$container === null || this.$container === undefined) {
            this.$container = $("<div />").addClass("viewContainer").appendTo($parentContainer);
        }
        this.$container.empty();
        return this.$container;
    }
}

VSS.initClassPrototype(TestVariableViewWrapper, {
    isEnabled: false,
    name: "variableTab",
    variableView: null
});

VSS.classExtend(ConfigurationsHubExplorerView, TfsContext.ControlExtensions);

Controls.Enhancement.registerEnhancement(ConfigurationsHubExplorerView, ".test-hub-configurations-view");

// TFS plugin model requires this call for each tfs module. 
VSS.tfsModuleLoaded("TFS.TestManagement.ConfigurationsHub", exports);
