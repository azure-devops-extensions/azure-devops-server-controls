import q = require("q");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Resources = require("TestManagement/Scripts/Resources/TFS.Resources.TestManagement");
import DefinitionTree = require("TestManagement/Scripts/TFS.TestManagement.Configurations.DefinitionTree");
import Menus = require("VSS/Controls/Menus");
import Navigation = require("VSS/Controls/Navigation");
import ConfigVariablesGrid = require("TestManagement/Scripts/TFS.TestManagement.ConfigurationVariablesGrid");
import TestsOM = require("TestManagement/Scripts/TFS.TestManagement");
import Controls = require("VSS/Controls");
import Contracts = require("TFS/TestManagement/Contracts");
import Combos = require("VSS/Controls/Combos");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import TMUtils = require("TestManagement/Scripts/TFS.TestManagement.Utils");
import TCMTelemetry = require("TestManagement/Scripts/TFS.TestManagement.Telemetry");
import Utils_UI = require("VSS/Utils/UI");
import VSS = require("VSS/VSS");

let TfsContext = TFS_Host_TfsContext.TfsContext;
let delegate = Utils_Core.delegate;
let TelemetryService = TCMTelemetry.TelemetryService;

class RightPaneUIControls {
    _configurationToolbar: Menus.MenuBar;
    _configurationTitle: JQuery;
    _configurationDescription: JQuery;
    _configurationState: Combos.Combo;
    _isDefaultConfigurationOption: JQuery;
    _configurationVariablesGrid: ConfigVariablesGrid.ConfigurationVariablesGrid;
    _addVariableToConfigurationElement: JQuery;
}

class TestConfigurationsToolbarCommands {        
    public static deleteTestConfiguration: string = "delete-test-configuration";
    public static refreshTestConfigurationSingle: string = "refresh-test-configuration";
    public static saveTestConfiguration: string = "save-test-configuration";    
}

export class TestConfigurationView extends Navigation.NavigationView {

    private _hubTitle: any;

    private _$rightPane: JQuery;
        
    private _allTestVariables: Contracts.TestVariable[] = [];
    private _selectedConfiguration: Contracts.TestConfiguration;
    private _rightPaneUIControls: RightPaneUIControls;
    private _currentConfigurationDetailsDirty: boolean;
    private _configurationsManager: TestsOM.TestConfigurationManager;    
    private _$errorDiv: any;
    
    //for tree control
    private _selectedDefinition: KnockoutObservable<DefinitionTree.ConfigurationDefinitionModel>;

    //Error handling
    private DeletedDefinitionError: number = 404;

    constructor(options?) {
        super(options);
        this._currentConfigurationDetailsDirty = false;
        this._configurationsManager = TMUtils.getTestConfigurationManager();
        this._selectedDefinition = DefinitionTree.definitionContext.selectedDefinition;
        this._allTestVariables = this._options._allTestVariables;
    }

    public initialize() {
        super.initialize();
        this._initializeUIControls();
    }        

    public _clearDirtyState() {
        /// <summary>Clears Configuration view dirty state</summary> 
        this._clearDirtyFlags();
        this._setSaveConfigurationButtonDisabledState();
    }
    
    public _fetchAndPopulateDataInRightPaneControls(configurationId: number, allTestVariables: Contracts.TestVariable[]): IPromise<Contracts.TestConfiguration> {
        /// <summary>Fetches latest test configuration object and displays its details</summary>
        /// <param name="variableId" type="String">Id of the configuration to be displayed</param>

        if (configurationId < -1) {
            //Todo: Instead of alert show banner            
            alert(Resources.InvalidConfigurationIdError);
            return null;
        }

        this._allTestVariables = allTestVariables;

        if (configurationId === -1) {           
            
            this._$rightPane.show();
            this._selectedConfiguration = null;
            this.clearRightPaneUIControls();
            this._setViewTitleConsideringDirtyState(-1, Resources.NewConfiguration);
            this._rightPaneUIControls._configurationVariablesGrid._populateConfigurationVariablesData(undefined, this._allTestVariables);
            this._setRefreshConfigurationButtonDisabledState();

            this._rightPaneUIControls._configurationTitle.focus();

            return null;
        }

        let deferred: Q.Deferred<Contracts.TestConfiguration> = q.defer<Contracts.TestConfiguration>();

        this._configurationsManager.beginGetTestConfigurationById(configurationId).then((configuration: Contracts.TestConfiguration) => {
            this._populateConfigurationDataInRightPaneControls(configuration);
            deferred.resolve(configuration);
        },
            (error) => {
                //Todo: Instead of alert show banner
                alert(error.message);
                if (error.status === this.DeletedDefinitionError) {

                    // remove this from tree also.
                    this._fire("deleteDefinition", { definitionId: configurationId });
                
                    //TODO: show the next configuration data
                
                    deferred.reject(error);
                }
            });

        return deferred.promise;
    }
    
    public isDirty(): boolean {
        /// <summary>Returns dirty state of configuration view</summary>  
        return this._currentConfigurationDetailsDirty || this._rightPaneUIControls._configurationVariablesGrid.currentConfigVariablesGridDirtyFlag;
    }

    public _save(): void {
        /// <summary>Saves current configuration if dirty</summary>  
        if (this._getToolbarButtonDisabledState(TestConfigurationsToolbarCommands.saveTestConfiguration) === false) {
            this.saveTestConfiguration();
        }
    }

    private _initializeUIControls(): void {

        this._$rightPane = this.getElement();

        this._hubTitle = this._$rightPane.parents().find(".right-hub-content").siblings(".hub-title");
        this._hubTitle.addClass("configuration-tab-title"); //Ineffective. ToDo.

        this._initializeRightPaneControls();        
    }

    private showError(message: string) {
        /// <summary>shows an error mesage</summary>
        /// <param name="message" type="String">the message to be displayed</param>
        if (!this._$errorDiv) {
            this._$errorDiv = $("<div class='inline-error' />").text(message).insertBefore(this._element.find(".hub-title")[0]);
            this._element.find(".hub-title, .right-hub-content").hide();
        }
    }

    private _clearError() {
        /// <summary>clears the error mesage</summary>
        let $errorDiv = this._$errorDiv || this._element.find(".inline-error");
        if ($errorDiv) {
            $errorDiv.remove();
            this._$errorDiv = null;
        }
        this._element.find(".hub-title, .right-hub-content").show();
    }
    
    private _onToolbarItemClick(e?: any) {

        let command = e.get_commandName();
        switch (e.get_commandName()) {

            case TestConfigurationsToolbarCommands.deleteTestConfiguration:
                this._clearError();
                this.deleteTestConfiguration();
                break;

            case TestConfigurationsToolbarCommands.saveTestConfiguration:
                this.saveTestConfiguration();
                break;

            case TestConfigurationsToolbarCommands.refreshTestConfigurationSingle:
                this.refreshTestConfigurationSingle();
                break;
        }
    }

    private deleteTestConfiguration() {
        if (confirm(Resources.DefinitionDelete_ConfirmMessage)) {
            if (this._selectedConfiguration === null || this._selectedConfiguration === undefined) {

                this._fire("deleteDefinition", { definitionId: -1 }); // New configuration scenario
                return;
            }

            this._configurationsManager.beginDeleteTestConfiguration(this._selectedConfiguration.id).then((a: any) => {

                this._fire("deleteDefinition", { definitionId: this._selectedConfiguration.id });
            }
                ,
                (error) => {
                    //Todo: Instead of alert show banner
                    if (error.status == this.DeletedDefinitionError) {
                        // remove this from tree also.

                        this._fire("deleteDefinition", { definitionId: this._selectedConfiguration.id });
                        alert(error.message);
                    }
                    else if (Utils_String.ignoreCaseComparer(error.serverError.typeKey, "TestObjectInUseException") === 0) {
                        alert(Utils_String.format(Resources.TestConfigurationInUseError, this._selectedConfiguration.name));
                    }
                    else {
                        alert(error.message);
                    }
                    
                });
            TelemetryService.publishEvents(TelemetryService.featureDeleteTestConfiguration, {});
        }
    }

    private getConfigurationTitle() {

        let configTitle: string = this._rightPaneUIControls._configurationTitle.val();

        if (configTitle) {

            configTitle = configTitle.trim();
        }

        return configTitle;
    }

    private saveTestConfiguration() {

        let configTitle: string = this.getConfigurationTitle();

        if (configTitle === null || configTitle === undefined ||
            Utils_String.ignoreCaseComparer(configTitle, Utils_String.empty) === 0) {
        
            alert(Resources.TestConfigurationTitleBlankError);
            return;
        }

        let configDescription: string = this._rightPaneUIControls._configurationDescription.val();
        if (configDescription !== null && configDescription !== undefined) {

            configDescription = configDescription.trim();
        }

        let config: Contracts.TestConfiguration = <Contracts.TestConfiguration>{
            description: configDescription,
            isDefault: this._rightPaneUIControls._isDefaultConfigurationOption.prop("checked"),
            name: configTitle,
            state: (Utils_String.ignoreCaseComparer(this._rightPaneUIControls._configurationState.getValue<string>(), Resources.ConfigurationStateActive) === 0) ? Contracts.TestConfigurationState.Active : Contracts.TestConfigurationState.Inactive,
            values: this._rightPaneUIControls._configurationVariablesGrid.getConfigurationVariablesData()
        };

        if (this._selectedConfiguration !== null && this._selectedConfiguration.id > 0) {
            config.revision = this._selectedConfiguration.revision;

            // update configuration
            this._configurationsManager.beginUpdateTestConfiguration(config, this._selectedConfiguration.id).then(
                (updatedConfig: Contracts.TestConfiguration) => {
                    this._populateConfigurationDataInRightPaneControls(updatedConfig);
                    this._fire("saveOrRefreshDefinition", { configurationName: updatedConfig.name });
                },
                (error) => {
                    alert(error.message);
                });
            TelemetryService.publishEvent(TelemetryService.featureUpdateTestConfiguration, TelemetryService.valueCount, config.values.length);
        }
        else {
            //create new configuration
            this._configurationsManager.beginCreateTestConfiguration(config).then(
                (createdConfig: Contracts.TestConfiguration) => {
                    this._populateConfigurationDataInRightPaneControls(createdConfig);
                    this._fire("saveOrRefreshDefinition", { configurationName: createdConfig.name, configurationId: createdConfig.id, configuration: createdConfig });
                },
                (error) => {
                    //Todo: Instead of alert show banner
                    alert(error.message);
                });
            TelemetryService.publishEvent(TelemetryService.featureCreateTestConfiguration, TelemetryService.valueCount, config.values.length);
        }
    }

    private refreshTestConfigurationSingle() {

        if (!this._confirmUserForUnsavedData()) {
            if (this._selectedConfiguration !== null && this._selectedConfiguration !== undefined) {
                this._configurationsManager.beginGetTestConfigurationById(this._selectedConfiguration.id).then(
                    (config: Contracts.TestConfiguration) => {
                        this._populateConfigurationDataInRightPaneControls(config);
                        this._fire("saveOrRefreshDefinition", { configurationName: config.name });
                    }
                    ,
                    (error) => {
                        //Todo: Instead of alert show banner
                        alert(error.message);
                    });
            }
            else {
                //clear the right pane for new defintion 
                this.clearRightPaneUIControls();
            }
        }
    }

    private _confirmUserForUnsavedData(): boolean {
        let isCancel: boolean = true;
        if (!(this.isDirty() === true &&
            !confirm(Resources.DefinitionDirtyWindow_ConfirmMessage))) {

            this._clearDirtyFlags();
            this._setSaveConfigurationButtonDisabledState();
            isCancel = false;
        }
        return isCancel;
    }
    
    //Right Pane Controls region
    
    private _initializeRightPaneControls() {

        this._rightPaneUIControls = new RightPaneUIControls();

        this._createConfigurationTabToolbar();
        this._createConfigurationDetailsControls();
        this._createConfigurationVariablesGrid();
        this._createAddConfigurationVariableElement();
    }

    private clearRightPaneUIControls() {

        if (this._rightPaneUIControls !== undefined) {

            this._clearConfigurationTitleField();

            this._rightPaneUIControls._configurationDescription.val(Utils_String.empty);
            this._rightPaneUIControls._configurationState.setSelectedIndex(0);
            this._rightPaneUIControls._isDefaultConfigurationOption.prop("checked", true);

            this._rightPaneUIControls._configurationVariablesGrid.reset();
            this._setStateOfAddVariableToConfigurationButton();
        }
        else {
            this._initializeRightPaneControls();
        }
    }

    private _clearConfigurationTitleField() {

        this._rightPaneUIControls._configurationTitle.val(Utils_String.empty);
        this._rightPaneUIControls._configurationTitle.addClass("invalid");
        this._setSaveConfigurationButtonDisabledState();
    }

    private _populateConfigurationDataInRightPaneControls(configuration: Contracts.TestConfiguration = undefined) {

        if (configuration !== null && configuration !== undefined) {

            this._selectedConfiguration = configuration;
                        
            this._rightPaneUIControls._configurationTitle.val(configuration.name);
            this._rightPaneUIControls._configurationTitle.removeClass("invalid");

            this._rightPaneUIControls._configurationDescription.val(configuration.description);

            if (configuration.state > 0) {
                this._rightPaneUIControls._configurationState.setSelectedIndex(configuration.state - 1);
            }
            
            this._rightPaneUIControls._isDefaultConfigurationOption.prop("checked", (configuration.isDefault === undefined || configuration.isDefault === null ? false : configuration.isDefault));

            this._rightPaneUIControls._configurationVariablesGrid._populateConfigurationVariablesData(configuration, this._allTestVariables);
            this._setStateOfAddVariableToConfigurationButton();
            this._setRefreshConfigurationButtonDisabledState();
            
            //Set cursor at end of title
            let title: string = this._rightPaneUIControls._configurationTitle.val();
            this._rightPaneUIControls._configurationTitle.focus().val("").val(title);

            this._clearDirtyState();

            this._setViewTitleConsideringDirtyState(configuration.id, configuration.name);
        }
    }

    private _setViewTitleConsideringDirtyState(configurationId: number, configurationTitle: string) {

        if (configurationId === -1) {
            this._hubTitle.text(configurationTitle);
        }
        else {
            this._hubTitle.text(Utils_String.format((this.isDirty() === true ? Resources.TestConfigurationTitleDirtyState : Resources.TestConfigurationTitle), configurationId, configurationTitle));
        }
    }

    private _updateViewTitleConsideringDirtyState() {

        let configTitle: string = this._rightPaneUIControls._configurationTitle.val();
        if (configTitle !== null && configTitle !== undefined) {

            configTitle = configTitle.trim();
        }

        let configId: number = -1;
        if (this._selectedConfiguration !== null && this._selectedConfiguration !== undefined && this._selectedConfiguration.id > 0) {

            configId = this._selectedConfiguration.id;
            this._setViewTitleConsideringDirtyState(configId, configTitle);
        }
        else {

            //New configuration scenario
            if (Utils_String.ignoreCaseComparer(configTitle, Utils_String.empty) === 0) {
                this._setViewTitleConsideringDirtyState(configId, Resources.NewConfiguration);
            }
        }
    }

    private _createConfigurationTabToolbar() {

        let hubPivotToolbar: JQuery = $("<div />").addClass("toolbar hub-pivot-toolbar");
        this._$rightPane.append(hubPivotToolbar);

        this._rightPaneUIControls._configurationToolbar = <Menus.MenuBar>Controls.BaseControl.createIn(Menus.MenuBar, hubPivotToolbar, {
            items: this._createConfigurationTabMenubarItems(),
            executeAction: delegate(this, this._onToolbarItemClick),
        });
    }

    private _createConfigurationTabMenubarItems(): any[] {
        let items: any[] = [];

        items.push({
            id: TestConfigurationsToolbarCommands.saveTestConfiguration,
            text: Resources.SaveText,
            showText: true,
            icon: "bowtie-icon bowtie-save",
            hidden: false
        });

        items.push({ separator: true });

        items.push({
            id: TestConfigurationsToolbarCommands.deleteTestConfiguration,
            title: Resources.DeleteText,
            showText: false,
            icon: "bowtie-icon bowtie-edit-delete"
        });

        items.push({
            id: TestConfigurationsToolbarCommands.refreshTestConfigurationSingle,
            title: Resources.Refresh,
            showText: false,
            icon: "bowtie-icon bowtie-navigate-refresh"
        });

        return items;
    }

    private _createConfigurationDetailsControls() {
        let $layoutTable = $("<table class ='configuration-details-table' />");
        this._rightPaneUIControls._configurationTitle = this._createConfigurationTitleRow($layoutTable);
        this._rightPaneUIControls._configurationDescription = this._createConfigurationDescriptionRow($layoutTable);
        this._rightPaneUIControls._configurationState = this._createConfigurationStateRow($layoutTable);
        this._rightPaneUIControls._isDefaultConfigurationOption = this._createConfigurationAssignToNewPlansOption($layoutTable);

        this._$rightPane.append($("<div />").addClass("configurations-view-right-pane").append($("<div />").addClass("configuration-details").append($layoutTable)));
    }

    private _createConfigurationTitleRow($table: JQuery): JQuery {
        let $inputText: JQuery = $("<input />")
            .attr("id", "test-configuration-title-input")
            .attr("type", "text")
            .attr("maxlength", "256")
            .addClass("test-configuration-title-input");

        Utils_UI.Watermark($inputText, { watermarkText: Resources.ConfigurationTitleWatermark });

        $("<tr/>").addClass("create-test-artifact-name-row")
            .append($("<td />").append($("<label />").addClass("configuration-title-label-cell").attr("for", "test-configuration-title-input").text(Resources.ConfigurationName)))
            .append($("<td colspan='2' />").append($inputText).addClass("create-test-artifact-value-cell"))
            .appendTo($table);

        this._bind($inputText, "input", () => {
            this._currentConfigurationDetailsDirty = true;

            let configTitle = $inputText.val();
            configTitle = $.trim(configTitle);

            if (configTitle === Utils_String.empty) {
                $inputText.addClass("invalid");
            }
            else {
                $inputText.removeClass("invalid");
            }

            let configId: number = -1;
            if (this._selectedConfiguration !== null && this._selectedConfiguration !== undefined && this._selectedConfiguration.id > 0) {
                configId = this._selectedConfiguration.id;
            }
            else if (Utils_String.ignoreCaseComparer(configTitle, Utils_String.empty) === 0) {
                configTitle = Resources.NewConfiguration;
            }

            this._setViewTitleConsideringDirtyState(configId, configTitle);

            this._setSaveConfigurationButtonDisabledState();
        });

        return $inputText;
    }

    private _createConfigurationDescriptionRow($table: JQuery): JQuery {
        let $inputText: JQuery = $("<textarea />")
		.attr("id", "test-configuration-description-input")
            .attr("type", "text")
            .attr("maxlength", "4095")
            .addClass("configuration-description-input");

        Utils_UI.Watermark($inputText, { watermarkText: Resources.ConfigurationDescriptionWatermark });

        $("<tr/>").addClass("create-test-artifact-name-row").height("5em")
            .append($("<td />").addClass("configuration-description-label-td").append($("<label />").attr("for", "test-configuration-description-input").addClass("configuration-description-label-cell").text(Resources.ConfigurationDescription)))
            .append($("<td colspan='2' />").append($inputText).addClass("configuration-description-value-cell"))
            .appendTo($table);

        this._bind($inputText, "input", () => {
            this._currentConfigurationDetailsDirty = true;
            this._setSaveConfigurationButtonDisabledState();
            this._updateViewTitleConsideringDirtyState();
        });

        return $inputText;
    }

    private _createConfigurationStateRow($table: JQuery): Combos.Combo {

        let $configStateDiv: JQuery = $("<div class = 'configuration-state-editable' />");
        let labelId = "test-configuration-state-label";

        let controlOptions = <Combos.IComboOptions>{
            id: "test-configuration-state-combo-box",
            allowEdit: false,
            indexChanged: delegate(this, () => {
                this._currentConfigurationDetailsDirty = true;
                this._setSaveConfigurationButtonDisabledState();
                this._updateViewTitleConsideringDirtyState();
            }),
            inputCss: "configuration-state-combo-input"
        };

        let enhancementOptions = <Controls.EnhancementOptions>{
            ariaAttributes: {
                labelledby: labelId
            }
        };

        let combo = <Combos.Combo>Controls.BaseControl.create(Combos.Combo, $configStateDiv, controlOptions, enhancementOptions);

        combo.getElement().height("30px");

        combo.setSource(this.getConfigurationStateValues());

        $("<tr/>").addClass("create-test-artifact-name-row")
            .append($("<td />").append($("<label />").addClass("configuration-state-label-cell").attr("id", labelId).text(Resources.ConfigurationState)))
            .append($("<td />").css("width", "40%").append($configStateDiv).addClass("create-test-artifact-value-cell"))
            .appendTo($table);

        return combo;
    }

    private _createConfigurationAssignToNewPlansOption($table: JQuery): JQuery {

        let $tableRow = $table.find("tr:last");
        let $checkBoxDiv = $("<div class='default-config-checkbox' />");
        let _checkBoxItem: JQuery = $("<input />", { id: "default-config-checkbox-input", type: "checkbox" });
        _checkBoxItem.change(() => {
            this._currentConfigurationDetailsDirty = true;
            this._setSaveConfigurationButtonDisabledState();
            this._updateViewTitleConsideringDirtyState();
        });

        let $checkBoxLabel = $("<label />", { "for": "default-config-checkbox-input", text: Resources.AssignToNewTestPlans });

        $checkBoxDiv.append(_checkBoxItem).append($checkBoxLabel);
        $tableRow.append($("<td />").css("padding-left", "10px").append($checkBoxDiv));

        return _checkBoxItem;
    }

    private _createConfigurationVariablesGrid() {

        let $configVariablesDiv = $("<div class='configuration-variables-label' />");
        let $configVariablesLabel: JQuery = $("<label />", { text: Resources.ConfigurationVariables });
        $configVariablesLabel.appendTo($configVariablesDiv);

        let $configVariablesGrid: JQuery = $("<div />").addClass("configuration-variables-grid");
        this._$rightPane.find(".configurations-view-right-pane").append($configVariablesGrid);

        $configVariablesGrid.append($configVariablesDiv);

        this._rightPaneUIControls._configurationVariablesGrid = <ConfigVariablesGrid.ConfigurationVariablesGrid>Controls.BaseControl.createIn(ConfigVariablesGrid.ConfigurationVariablesGrid, $configVariablesGrid, {
            coreCssClass: "configuration-variables-grid-layout"
        });
        
        this._rightPaneUIControls._configurationVariablesGrid._element.change(delegate(this, () => {
            this._setStateOfAddVariableToConfigurationButton();
            this._setSaveConfigurationButtonDisabledState();
            this._updateViewTitleConsideringDirtyState();
        }));
    }

    private _createAddConfigurationVariableElement() {

        let addVariableDiv: JQuery = $("<div />").attr({
                "role": "button",
                "tabIndex": "0"
            }).addClass("add-new-value-container add-configuration-variable").click(delegate(this, this._addTestVariableToConfiguration)).keydown(Utils_UI.buttonKeydownHandler);

        addVariableDiv.append($("<span />").addClass("add-icon bowtie-icon bowtie-math-plus"))
            .append($("<span />").addClass("add-new-value-link").text(Resources.AddConfigurationVariable));

        this._$rightPane.find(".configurations-view-right-pane").append(addVariableDiv)
            .append($("<div />").addClass("add-new-value-empty-div")); //Adding an empty div at bottom to give some space below Add variable element;
        this._rightPaneUIControls._addVariableToConfigurationElement = addVariableDiv;
    }

    private _addTestVariableToConfiguration() {

        if (this._rightPaneUIControls._addVariableToConfigurationElement.hasClass("disabled") !== true) {

            if (this._rightPaneUIControls._configurationVariablesGrid !== null && this._rightPaneUIControls._configurationVariablesGrid !== undefined
                && this._rightPaneUIControls._configurationVariablesGrid._dataSource.length < this._allTestVariables.length) {

                this._rightPaneUIControls._configurationVariablesGrid.addRow();
                this._setSaveConfigurationButtonDisabledState();
            }
        }
    }

    private _setStateOfAddVariableToConfigurationButton(): void {

        if (this._rightPaneUIControls._configurationVariablesGrid !== null && this._rightPaneUIControls._configurationVariablesGrid !== undefined &&
            this._rightPaneUIControls._configurationVariablesGrid._dataSource !== null && this._rightPaneUIControls._configurationVariablesGrid._dataSource !== undefined &&
            this._allTestVariables !== null && this._allTestVariables !== undefined) {
            if (this._rightPaneUIControls._configurationVariablesGrid._dataSource.length >= this._allTestVariables.length) {

                this._rightPaneUIControls._addVariableToConfigurationElement.addClass("disabled").attr("aria-disabled", "true");
            }
            else {
                this._rightPaneUIControls._addVariableToConfigurationElement.removeClass("disabled").attr("aria-disabled", "false");
            }

        }
    }

    private getConfigurationStateValues(): string[] {
        return [
            Resources.ConfigurationStateActive,
            Resources.ConfigurationStateInActive
        ];
    }

    private _setSaveConfigurationButtonDisabledState() {

        let isDisabled: boolean = true;

        if (Utils_String.ignoreCaseComparer(this._rightPaneUIControls._configurationTitle.val().trim(), Utils_String.empty) !== 0 &&
            this.isDirty() === true) {
            isDisabled = false;
        }

        this._setToolbarButtonDisabledState(TestConfigurationsToolbarCommands.saveTestConfiguration, isDisabled);
    }

    private _setRefreshConfigurationButtonDisabledState() {

        let isDisabled: boolean = true;

        if (this._selectedConfiguration && this._selectedConfiguration.id !== -1) {
            isDisabled = false;
        }

        this._setToolbarButtonDisabledState(TestConfigurationsToolbarCommands.refreshTestConfigurationSingle, isDisabled);
    }

    private _setToolbarButtonDisabledState(buttonId: string, isDisabled: boolean) {

        this._rightPaneUIControls._configurationToolbar.updateCommandStates
            ([{
                id: buttonId,
                disabled: isDisabled
            }]);
    }

    private _getToolbarButtonDisabledState(buttonId: string): boolean {

        return (this._rightPaneUIControls._configurationToolbar.getCommandState(buttonId) === Menus.MenuItemState.Disabled);            
    }

    private _clearDirtyFlags() {
        this._currentConfigurationDetailsDirty = false;
        this._rightPaneUIControls._configurationVariablesGrid.currentConfigVariablesGridDirtyFlag = false;
    }
    //Right Pane Controls region ends
}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.TestManagement.ConfigurationView", exports);
