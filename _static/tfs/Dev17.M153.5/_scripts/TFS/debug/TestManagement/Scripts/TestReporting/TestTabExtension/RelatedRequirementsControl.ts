
import MentionAutocomplete = require("Mention/Scripts/TFS.Mention.Autocomplete");
import MentionWorkItems = require("Mention/Scripts/TFS.Mention.WorkItems");
import "Mention/Scripts/TFS.Mention.WorkItems.Registration";  // to register work-item mention parser and provider
import Contracts = require("TFS/TestManagement/Contracts");
import ResultsGrid = require("TestManagement/Scripts/TestReporting/TestTabExtension/TestResults.Grid");
import Resources = require("TestManagement/Scripts/Resources/TFS.Resources.TestManagement");
import TMService = require("TestManagement/Scripts/TFS.TestManagement.Service");
import TM_Utils = require("TestManagement/Scripts/TFS.TestManagement.Utils");
import TCMTelemetry = require("TestManagement/Scripts/TFS.TestManagement.Telemetry");

import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import MentionPickerControl = require("Mention/Scripts/TFS.Mention.Controls.Picker");
import Artifacts_Plugins = require("Presentation/Scripts/TFS/TFS.UI.Controls.ArtifactPlugins");
import WorkItemTracking_Constants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");
import Artifact_Constants = require("VSS/Artifacts/Constants");
import {IArtifactType} from "Presentation/Scripts/TFS/TFS.ArtifactPlugins";

import Controls = require("VSS/Controls");
import Diag = require("VSS/Diag");
import Dialogs = require("VSS/Controls/Dialogs");
import Utils_String = require("VSS/Utils/String");
import * as VSS_Service from "VSS/Service";
import { TestManagementMigrationService } from "TestManagement/Scripts/TestManagementMigrationService";

let TelemetryService = TCMTelemetry.TelemetryService;

export interface IRelatedRequirementsOptions {
    height: number;
    width: number;
    resultModels: ResultsGrid.IResultViewModel[];
    close: Function;
}

export class RelatedRequirementsControl extends Controls.BaseControl {

    public initialize() {
        super.initialize();
        
        this._createControlOptions();
        let $container = this._element;
        this._createLayout();
        this._$messageElement.attr("class", "test-results-requirement-linked-to-test-method");

        let $commonContainer = $(`<div class="test-results-relatedartifacts-hostcontrol"></div>`);
        this._wiql = `([${WorkItemTracking_Constants.CoreFieldRefNames.WorkItemType}] In Group "Microsoft.RequirementCategory"
                        AND [${WorkItemTracking_Constants.CoreFieldRefNames.ChangedDate}] >= @today - 30
                        AND [${WorkItemTracking_Constants.CoreFieldRefNames.State}] NOT IN ('Completed','Cut','Closed','Done')
                        AND [${WorkItemTracking_Constants.CoreFieldRefNames.AreaPath}] = '{0}')
                    ORDER BY [${WorkItemTracking_Constants.CoreFieldRefNames.CreatedDate}] DESC`;

        this._commonControl = <Artifacts_Plugins.RelatedArtifactsControl>Controls.BaseControl.createIn<Artifacts_Plugins.IRelatedArtifactsControlOptions>(Artifacts_Plugins.RelatedArtifactsControl, $commonContainer, this._controlOptions);
        let $inputTextBox: JQuery = this._getInputTextBoxPart();
        
        TM_Utils.WorkItemUtils.beginGetTeamSettingsData((teamSettings) => {
            let areaPath = teamSettings.getDefaultArea();
            if ($inputTextBox && $inputTextBox.length > 0) {
                let mentionPicker = <MentionPickerControl.MentionPickerEnhancement>Controls.Enhancement.enhance(MentionPickerControl.MentionPickerEnhancement,
                    $inputTextBox,
                    {
                        mentionType: MentionAutocomplete.MentionType.WorkItem,
                        select: (replacement) => {
                            try {
                                this._$messageElement.hide();
                                let selectedRequirement: JQuery = this.getElement().find(".mention-autocomplete-menu").find(".ui-state-focus");
                                this._showSelectedRequirement(selectedRequirement);
                                this._textVal = replacement.getPlainText().textBeforeSelection;
                                //if the text box was empty (because the user just clicked on the box and then on a work item),
                                //lose focus so that they can repeat that behavior.
                                //Otherwise, select the text so that the user can begin typing again for a new work item.
                                //The reason we don't clear the box is because if we clear and don't lose focus, the popup immediately re-appears
                                //and this blocks the user's view of their newly added work item which can give the illusion that nothing was added.
                                let typedText = $inputTextBox.val();
                                if (typedText === Utils_String.empty) {
                                    $inputTextBox.blur();
                                }
                                else {
                                    $inputTextBox.select();
                                }
                            } catch (e) {
                                Diag.logWarning(e);
                            }
                        },
                        pluginConfigs: [{
                            factory: o => new MentionWorkItems.WorkItemAutocompleteProvider($.extend(<MentionWorkItems.IWorkItemAutocompletePluginOptions>{
                                wiql: Utils_String.format(this._wiql, areaPath)
                            }, o))
                        }]
                    }
                );
            }
        });
       
        $container.append($(`<div />`)).append(this._$layout);
        $container.append($commonContainer);
    }

    //returns whether the string was a valid work item identifier
    public async validateAndCreateWorkItemLink(): Promise<void> {
        let resultCount: number = this._options.resultModels.length;
        if (resultCount > 0 && resultCount <= this._maxResultCount) {
            if (!(this._textVal && this._textVal.length > 0)) {
                throw (Utils_String.format("Invalid work item: {0}", this._textVal));
            }

            let workItemId = +this._textVal; //workItemId will store textVal if textVal is convertible to number
            if (this._textVal[0] === "#") {
                workItemId = +this._textVal.substr(1);
            }
            if (isNaN(workItemId) || (workItemId % 1 !== 0)) {
                throw (Utils_String.format("Invalid work item: {0}", this._textVal));
            }
            
            this._$messageElement.hide();
            const payload: Contracts.WorkItemToTestLinks[] = await this._constructLinkingPayload(this._options.resultModels, workItemId);
            Promise
                .all(payload.map(p => this._addWorkItemToTestLinks(p)))
                .then(() => {
                //Close the dialog if requirement is linked successfully
                    this._options.relatedRequirementDialog.close();

                    this._addTelemetry(workItemId.toString());
                    Diag.logInfo("Work item linked successfully to selected test methods");
                }, (error) => {
                    this._showErrorMessageSection(error.message);
                    Diag.logWarning(Utils_String.format("Couldn't link work items to test methods, error: {0}", error));
                });
        }
        else if (resultCount > this._maxResultCount) {
            this._showErrorMessageSection(Resources.MaximumTestLimitErrorMessage);
        }
    
        else {
            this.showRequirementControl();
        }
    }

    private async _constructLinkingPayload(results, workItemId): Promise<Contracts.WorkItemToTestLinks[]> {
        let testMethodsInTfs: Contracts.TestMethod[] = [];
        let testMethodsInTcm: Contracts.TestMethod[] = [];
        const service = VSS_Service.getService(TestManagementMigrationService);
        for (const result of results) {
            const testMethod: Contracts.TestMethod = { name: result.testTitle, container: result.storage };
            const isTestRunInTcm = await service.isTestRunInTcm(result.runId);
            if (isTestRunInTcm) {
                testMethodsInTcm.push(testMethod);
            } else {
                testMethodsInTfs.push(testMethod);
            }
        }
        const workItem: Contracts.WorkItemReference = {
            id: workItemId.toString(),
            name: Utils_String.empty,
            type: Utils_String.empty,
            url: Utils_String.empty,
            webUrl: Utils_String.empty
        };
        const workItemToTestLinksInTfs: Contracts.WorkItemToTestLinks = {
            tests: testMethodsInTfs,
            workItem: workItem,
            executedIn: Contracts.Service.Tfs
        };
        const workItemToTestLinksInTcm: Contracts.WorkItemToTestLinks = {
            tests: testMethodsInTcm,
            workItem: workItem,
            executedIn: Contracts.Service.Tcm
        };
        let result: Contracts.WorkItemToTestLinks[] = [];
        if (workItemToTestLinksInTcm.tests.length > 0) {
            result.push(workItemToTestLinksInTcm);
        }
        if (workItemToTestLinksInTfs.tests.length > 0) {
            result.push(workItemToTestLinksInTfs);
        }
        return result;
    }

    private _addWorkItemToTestLinks(workItemToTestLink: Contracts.WorkItemToTestLinks): IPromise<Contracts.WorkItemToTestLinks> {
        return TMService.ServiceManager.instance().testResultsService().addWorkItemToTestLinks(workItemToTestLink);
    }

    public showRequirementControl() {
        this._$selectedRequirementBox.hide();
        this._$layout.find("input[class^='test-results-relatedartifacts-addartifactbox']").val(Utils_String.empty);
        this._$layout.show();
    }

    //caller method for Unit Test
    public async callValidateAndCreateWorkItemLink(textVal: string): Promise<void> {
        this._textVal = textVal;
        await this.validateAndCreateWorkItemLink();
    }

    private _showErrorMessageSection(message: string) {
        this._$messageElement.text(message).appendTo(this._$layout);
        this._$messageElement.show();
        this.showRequirementControl();
    }

    private _showSelectedRequirement(selectedRequirement: JQuery) {
        this._$layout.find(".bowtie-triangle-down").click();
        this._$layout.hide();

        this._$selectedRequirementBox.empty();
        this._$selectedRequirementBox.addClass("test-results-relatedartifacts-addartifactbox test-results-selected-requirement");
        selectedRequirement.appendTo(this._$selectedRequirementBox);
        this._$selectedRequirementBox.appendTo(this._options.relatedRequirementDialog._element);
        this._$selectedRequirementBox.show();

        //On clicking selected requirement the requirement control should appear
        this._$selectedRequirementBox.on("click", () => {
            this._$selectedRequirementBox.hide();
            this._$layout.find("input[class^='test-results-relatedartifacts-addartifactbox']").val(Utils_String.empty);
            this._$layout.show();
            this._$layout.find(".bowtie-triangle-down").click();
        });

        this._options.relatedRequirementDialog.updateOkButton(true);
    }

    private _createControlOptions() {
        this._controlOptions = {
            tfsContext: TFS_Host_TfsContext.TfsContext.getDefault(),
            artifactOrder: <IArtifactType[]>[{ tool: Artifact_Constants.ToolNames.WorkItemTracking, type: Artifact_Constants.ArtifactTypeNames.WorkItem }],
            errorCallback: (error) => {
                Diag.logWarning(error);
            }
        };
    }

    private _createLayout() {
        this._$layout = $(
            `<div class='test-results-relatedartifacts-addartifactbox-container' >
                   <div class="drop-icon bowtie-icon bowtie-triangle-down"/>
                  <input type="text" class="test-results-relatedartifacts-addartifactbox textbox-input" placeholder="${Resources.SearchWorkItem}" />
            </div>`
            );
        if (this._options.resultModels.length === 0) {
            let noTestMethodSelectedDiv: JQuery = $("<div \>").addClass("test-results-requirement-linked-to-test-method")
                .text(Resources.NoTestMethodSelectedText).appendTo(this._$layout);
        }
    }

    private _getInputTextBoxPart(): JQuery {
        return this._$layout.find(".test-results-relatedartifacts-addartifactbox");
    }

    private _addTelemetry(workItemId: string) {
        TelemetryService.publishEvents(TelemetryService.featureTestTabInBuildSummary_RequirementToTestsLinked,
            {
                "TestsCount": this._options.resultModels.length,
                "WorkItemId": workItemId
            });
    }

    private _commonControl: Artifacts_Plugins.RelatedArtifactsControl;
    private _controlOptions: Artifacts_Plugins.IRelatedArtifactsControlOptions;
    private _$layout: JQuery;
    private _$messageElement: JQuery = $("<div />");
    private _$selectedRequirementBox: JQuery = $("<div />");
    private _textVal: string;
    private _maxResultCount: number = 50;
    private _wiql: string;
}

export class TestResultsRelatedRequirementsDialog extends Dialogs.ModalDialogO<Dialogs.IModalDialogOptions>{
    constructor(options?: IRelatedRequirementsOptions) {
        super(options);
        this._resultModels = options.resultModels;
    }

    public initialize() {
        super.initialize();
        // Setting the title of the dialog
        this.setTitle(Resources.RelatedRequirementDialogTitle);
        this.populateDialog();
    }

    public onOkClick() {
        this._relatedRequirement.validateAndCreateWorkItemLink();
        this.updateOkButton(false);
    }

    private populateDialog() {
        this.updateOkButton(false);
        let $relatedRequirementsDiv: JQuery = $("<div class='test-results-related-requirements' />").appendTo(this._element);
        this._relatedRequirement = <RelatedRequirementsControl>Controls.BaseControl.createIn(RelatedRequirementsControl, $relatedRequirementsDiv, {
            resultModels: this._resultModels,
            relatedRequirementDialog: this
        });
    }
    private _relatedRequirement: RelatedRequirementsControl;
    private _resultModels: ResultsGrid.IResultViewModel[];
}
