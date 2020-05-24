///<amd-dependency path="jQueryUI/dialog"/>
///<amd-dependency path='VSS/LoaderPlugins/Css!Site' />

/// <reference types="jquery" />

import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";

import { WorkItemControl } from "WorkItemTracking/Scripts/Controls/WorkItemForm/WorkItemControl";
import * as WITOM from "WorkItemTracking/Scripts/TFS.WorkItemTracking";

import * as Utils_Core from "VSS/Utils/Core";
import * as Utils_String from "VSS/Utils/String";
import * as VSS from "VSS/VSS";

export class AssociatedAutomationControl extends WorkItemControl {

    private _control: JQuery;
    private _clearButton: JQuery;
    private _automatedTestName: JQuery;
    private _automatedTestStorage: JQuery;
    private _automatedTestType: JQuery;
    private _automatedTestNameField: WITOM.Field;
    private _automatedTestStorageField: WITOM.Field;
    private _automatedTestTypeField: WITOM.Field;
    private _automatedTestIdField: WITOM.Field;
    private _automatedTestAutomationStatusField: WITOM.Field;

    constructor(container, options?, workItemType?) {
        super(container, options, workItemType);
    }

    public invalidate(flushing) {

        if (this._automatedTestIdField) {
            let automatedTestId = this._automatedTestIdField.getValue();
            let disable: boolean = (automatedTestId == null || Utils_String.equals(automatedTestId, Utils_String.empty));
            // Disable the clear automation button when no test are associated
            this._clearButton.prop("disabled", disable);
        }

        if (this._automatedTestNameField) {
            this._automatedTestName.text(this._automatedTestNameField.getValue());
        }

        if (this._automatedTestStorageField) {
            this._automatedTestStorage.text(this._automatedTestStorageField.getValue());
        }

        if (this._automatedTestTypeField) {
            this._automatedTestType.text(this._automatedTestTypeField.getValue());
        }
    }

    public bind(workItem: WITOM.WorkItem) {
        let self = this, i, len;
        this._automatedTestNameField = workItem.getField("Microsoft.VSTS.TCM.AutomatedTestName");
        this._automatedTestStorageField = workItem.getField("Microsoft.VSTS.TCM.AutomatedTestStorage");
        this._automatedTestTypeField = workItem.getField("Microsoft.VSTS.TCM.AutomatedTestType");
        this._automatedTestIdField = workItem.getField("Microsoft.VSTS.TCM.AutomatedTestId");
        this._automatedTestAutomationStatusField = workItem.getField("Microsoft.VSTS.TCM.AutomationStatus");

        if (this._fieldEvents) {
            this._onFieldChanged = function (field) {
                self.invalidate(self._flushing);
            };

            for (i = 0, len = this._fieldEvents.length; i < len; i++) {
                workItem.attachFieldChange(this._fieldEvents[i], this._onFieldChanged);
            }
        }
        this.invalidate(false);
    }

    public _init() {
        super._init();
        this._control = $("<div class='automation-control'></div>").appendTo(this._container);

        //create test name
        $("<div class=\"workitemcontrol-label\"/>").appendTo(this._control).text(Resources.AutomatedTestName);
        this._automatedTestName = $("<div class=\"automation-info\"/>").appendTo(this._control);

        //create test storage
        $("<div class=\"workitemcontrol-label\"/>").appendTo(this._control).text(Resources.AutomatedTestStorage);
        this._automatedTestStorage = $("<div class=\"automation-info\"/>").appendTo(this._control);

        //create test type
        $("<div class=\"workitemcontrol-label\"/>").appendTo(this._control).text(Resources.AutomatedTestType);
        this._automatedTestType = $("<div class=\"automation-info\"/>").appendTo(this._control);

        // Clear button
        let cleardiv = $("<div class=\"clear-association-testcase\"/>").appendTo(this._control);
        this._clearButton = $("<button>")
            .text(Resources.ClearAssociatedAutomation)
            .attr("aria-label", Resources.ClearAutomationDescriptionText)
            .addClass("clear-associate-automation-btn")
            .click(Utils_Core.delegate(this, this._onClearAutomation))
            .appendTo(cleardiv);

        this._fieldEvents = ["Microsoft.VSTS.TCM.AutomatedTestName", "Microsoft.VSTS.TCM.AutomatedTestStorage", "Microsoft.VSTS.TCM.AutomatedTestType", "Microsoft.VSTS.TCM.AutomatedTestId"];
    }

    private _onClearAutomation(): void {
        // Consolidate the invalidate calls into a single one
        let currentsuppressInvalidate = this.suppressInvalidate;
        this.suppressInvalidate = true;
        if (this._automatedTestIdField) {
            this._automatedTestIdField.setValue(null);
            if (this._automatedTestAutomationStatusField) {
                const allowedValues: string[] = this._automatedTestAutomationStatusField.getAllowedValues();
                if (allowedValues && allowedValues.length > 0) {
                    this._automatedTestAutomationStatusField.setValue(allowedValues[0]);
                }
            }
        }
        if (this._automatedTestNameField) {
            this._automatedTestNameField.setValue(null);
        }
        if (this._automatedTestStorageField) {
            this._automatedTestStorageField.setValue(null);
        }
        if (this._automatedTestTypeField) {
            this._automatedTestTypeField.setValue(null);
        }
        //Restore invalidation
        this.suppressInvalidate = currentsuppressInvalidate;
        //Ensure invalidate is called
        this.invalidate(this._flushing);
    }
}

VSS.initClassPrototype(AssociatedAutomationControl, {
    _control: null,
    _automatedTestName: null,
    _automatedTestStorage: null,
    _automatedTestType: null,
    _automatedTestNameField: null,
    _automatedTestStorageField: null,
    _automatedTestTypeField: null
});