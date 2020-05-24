import Context = require("VSS/Context");
import Telemetry = require("VSS/Telemetry/Services");
import { ProcessRule, RuleAction, RuleActionType, RuleCondition, RuleConditionType } from "TFS/WorkItemTracking/ProcessContracts";
import { FieldUtils } from "WorkCustomization/Scripts/Utils/CommonUtils";

export class ProcessCustomizationTelemetry {

    public static Area = "ProcessCustomization";

    /**
     * Publishes a telemetry event
     * @param {string} featureName - The feature name.
     * @param {IDictionaryStringTo<string | number | boolean>} properties - The key:value list of event properties.
     * @param {number} startTime - The Date.now() at the start of the event process.
     * @param {boolean} immediate - If true, make ajax calls to publish the event immediately. Otherwise queue the event and send in delayed batches.
     */
    public static publish(featureName: string, properties: IDictionaryStringTo<string | number | boolean>, startTime?: number, immediate: boolean = false): void {
        
        Telemetry.publishEvent(new Telemetry.TelemetryEventData(ProcessCustomizationTelemetry.Area, featureName, properties, startTime), immediate);
    }

    public static onRuleSaved(rule: ProcessRule, processId: string, witRefNameForRules: string): void {
        let context = Context.getPageContext();
        
        let actionsArray: RuleActionType[] = [];
        let conditionsArray: RuleConditionType[] = [];
        let actsOnOOBField = false;
        rule.actions.forEach((value: RuleAction) => {
            actionsArray.push(value.actionType);
            if (!FieldUtils.isCustomField(value.targetField)) {
                actsOnOOBField = true;
            }
        });
        rule.conditions.forEach((value: RuleCondition) => {
            conditionsArray.push(value.conditionType);
        });
        const properties: IDictionaryStringTo<any> = {
            "ActionCount": rule.actions.length,
            "ConditionCount": rule.conditions.length,
            "ActionsArray": actionsArray,
            "ConditionsArray": conditionsArray,
            "AccountName": context.webContext.account.name,
            "ProcessId": processId,
            "WitRefName": "[NonEmail: " + witRefNameForRules + "]",
            "isUpdate": !!rule.id,
            "actsOnOOBField": actsOnOOBField
        };
        ProcessCustomizationTelemetry.publish("RuleSaved", properties, Date.now(), true);
    }

    public static onRuleDeleted(processId, witRefNameForRules): void {
        let context = Context.getPageContext();

        const properties: IDictionaryStringTo<any> = {
            "AccountName": context.webContext.account.name,
            "ProcessId": processId,
            "WitRefName": "[NonEmail: " + witRefNameForRules + "]"
        };
        ProcessCustomizationTelemetry.publish("RuleDeleted", properties, Date.now(), true);
    }

    public static onRuleDisabled(processId, witRefNameForRules): void {
        let context = Context.getPageContext();

        const properties: IDictionaryStringTo<any> = {
            "AccountName": context.webContext.account.name,
            "ProcessId": processId,
            "WitRefName": "[NonEmail: " + witRefNameForRules + "]"
        };
        ProcessCustomizationTelemetry.publish("RuleDisabled", properties, Date.now(), true);
    }

    public static onProcessCopySucceeded(sourceProcessId: string, targetProcessId: string, taskLog: string[]): void {
        let context = Context.getPageContext();
        
        const properties: IDictionaryStringTo<any> = {
            "AccountName": context.webContext.account.name,
            "SourceProcessId": sourceProcessId,
            "TargetProcessId": targetProcessId,
            "TaskLog": taskLog
        };
        ProcessCustomizationTelemetry.publish("ProcessCopySucceeded", properties, Date.now(), true);
    }

    public static onProcessCopyFailed(sourceProcessId: string, failedTask: string, errorMsg: string, taskLog: string[]): void {
        let context = Context.getPageContext();
        
        const properties: IDictionaryStringTo<any> = {
            "AccountName": context.webContext.account.name,
            "SourceProcessId": sourceProcessId,
            "FailedTask": failedTask,
            "ErrorMsg": errorMsg,
            "TaskLog": taskLog
        };
        ProcessCustomizationTelemetry.publish("ProcessCopyFailed", properties, Date.now(), true);
    }

    public static onProcessCreateFromOOBProcessPageMessage(ProcessName: string): void {
        let context = Context.getPageContext();

        const properties: IDictionaryStringTo<any> = {
            "AccountName": context.webContext.account.name,
            "OOBProcess": ProcessName,
        };
        ProcessCustomizationTelemetry.publish("ProcessCreatedFromOOBProcessPageMessage", properties, Date.now(), true);
    }
}