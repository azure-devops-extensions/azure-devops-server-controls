import { publishEvent, TelemetryEventData } from "VSS/Telemetry/Services";
import CIConstants = require("WorkItemTracking/Scripts/CustomerIntelligence");
import Navigation = require("VSS/Controls/Navigation");
import { WitFormModeUtility } from "WorkItemTracking/Scripts/Utils/WitControlMode";
import { WorkItemDocument } from "WorkItemTracking/Scripts/Utils/WorkItemDocument";
import Events_Document = require("VSS/Events/Document");

export namespace WIFormCIDataHelper {
    export function getArea() {
        return WitFormModeUtility.isMobileForm
            ? CIConstants.WITCustomerIntelligenceArea.WORK_ITEM_TRACKING_MOBILE
            : CIConstants.WITCustomerIntelligenceArea.WORK_ITEM_TRACKING
    }

    export function workItemOpenInNewTabEvent() {
        const cidata: { [key: string]: any } = {
            "OpenInNewTabClicked": "True",
            "FullScreenWhenClicked": Navigation.FullScreenHelper.getFullScreen() ? "True" : "False"
        };
        publishEvent(new TelemetryEventData(
            getArea(),
            CIConstants.WITCustomerIntelligenceFeature.CLIENTSIDEOPERATION_OPEN_WORK_ITEM_IN_NEW_TAB,
            cidata));
    }

    export function discussionControlCommentSaveEvent() {
        const cidata: { [key: string]: any } = {
            "Action": "Discussion.CommentSave"
        };

        publishEvent(new TelemetryEventData(
            getArea(),
            CIConstants.WITCustomerIntelligenceFeature.WORKITEM_DISCUSSIONCONTROL,
            cidata));
    }

    export function workItemTabClick(tabName: string, additionalProps?: { [key: string]: any }) {
        const activeDocument = <WorkItemDocument>Events_Document.getService().getActiveDocument();
        let workitem;
        if (activeDocument) {
            workitem = activeDocument.getWorkItem();
        }

        const cidata: { [key: string]: any } = {
            "Tab": tabName
        };
        if (workitem) {
            cidata["workItemSessionId"] = workitem.sessionId;
        }

        $.extend(cidata, additionalProps || {});

        publishEvent(new TelemetryEventData(
            getArea(),
            CIConstants.WITCustomerIntelligenceFeature.CLIENTSIDEOPERATION_WIT_TABSELECTION,
            cidata));
    }

    export function groupPanelCollapsed(isExpanded: boolean, additionalProps?: { [key: string]: any }) {
        const cidata: { [key: string]: any } = {
            "isExpanded": isExpanded
        };

        $.extend(cidata, additionalProps || {});

        publishEvent(new TelemetryEventData(
            getArea(),
            CIConstants.WITCustomerIntelligenceFeature.CLIENTSIDEOPERATION_WIT_GROUPCOLLAPSED,
            cidata));
    }

    export function fieldKeyboardShortcutPressed(charCode: string) {
        publishEvent(new TelemetryEventData(
            getArea(),
            CIConstants.WITCustomerIntelligenceFeature.CLIENTSIDEOPERATION_WIT_FIELDKEYBOARDSHORTCUT,
            {
                "shortcut": `alt + ${charCode}`,
            }));
    }

    export function fieldValueChanged(workItemSessionId: string, fieldRefName: string, controlType: string) {
        publishEvent(new TelemetryEventData(
            getArea(),
            CIConstants.WITPerformanceScenario.WORKITEM_FIELDCHANGED, {
                "workItemSessionId": workItemSessionId,
                "fieldRefName": `[NonEmail:${fieldRefName}]`,
                "controlType": controlType
            },
            Date.now()));
    }

    export function workItemDisposed(workItemSessionId: string) {
        publishEvent(new TelemetryEventData(
            getArea(),
            CIConstants.WITPerformanceScenario.WORKITEM_CLOSED,
            {
                "workItemSessionId": workItemSessionId,
                "action": "Closing workitem"
            },
            Date.now()));
    }

    export function classificationPickerValueChanged(value: string, isSuggestedValue: boolean, fieldRefName: string) {
        publishEvent(new TelemetryEventData(
            getArea(),
            CIConstants.WITCustomerIntelligenceFeature.CLASSIFICATION_MRU_VALUE_CHANGED,
            {
                "isSuggestedValue": isSuggestedValue,
                "fieldRefName": `[NonEmail:${fieldRefName}]`
            },
            Date.now()));
    }
}

