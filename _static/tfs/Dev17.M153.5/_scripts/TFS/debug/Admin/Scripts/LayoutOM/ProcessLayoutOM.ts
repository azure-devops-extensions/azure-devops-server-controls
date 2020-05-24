/// <amd-dependency path="jQueryUI/sortable"/>
/// <amd-dependency path="jQueryUI/core"/>
/// <reference types="knockout" />
import { ProcessWorkItemType, ProcessWorkItemTypeField, CreateProcessWorkItemTypeRequest } from "TFS/WorkItemTracking/ProcessContracts";
import { ProcessField, ProcessDefinitionFieldUsageData } from "Admin/Scripts/Contracts/TFS.Admin.Process.Contracts";
import * as AdminProcessCommon from "Admin/Scripts/TFS.Admin.Process.Common";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { PageOM } from "Admin/Scripts/LayoutOM/PageOM";
import { GroupOM } from "Admin/Scripts/LayoutOM/GroupOM";
import { ControlOM } from "Admin/Scripts/LayoutOM/ControlOM";
import { FieldOM } from "Admin/Scripts/LayoutOM/FieldOM";
import { Utils } from "Admin/Scripts/Common/Utils";

export interface ILayoutOMOptions {
        tfsContext: TfsContext;
        controlContributionInputLimit: number;
        getWorkItemType: () => ProcessWorkItemType;
        getProcess: () => AdminProcessCommon.ProcessDescriptorViewModel;
        setError: (message: string) => void;
        refresh: (focusedPageId?: string, focusedGroupId?: string, focusedControlId?: string) => void;
        disableOrdering: () => void;
        hideBusyOverlay: () => void;
        addHistoryPoint: (data: any) => void;
}

export interface IBeginAddFieldToWorkItemType extends Function {
    (field: ProcessWorkItemTypeField, processId: string, witRefName: string): IPromise<ProcessWorkItemTypeField>
}

/**
 * Class for OM manipulation by ProcessLayoutView
 */
export class ProcessLayoutOM {
    public fieldsMap: IDictionaryStringTo<ProcessField> = {};
    private _processFieldHelper = new AdminProcessCommon.ProcessFieldHelper();

    private _fieldUsageData: ProcessDefinitionFieldUsageData;

    set fieldUsageData(data: ProcessDefinitionFieldUsageData) {
        this._fieldUsageData = data;
        this._fieldUsageData.Fields.forEach((field) => {
            this.fieldsMap[field.Id] = field;
        });

    }
    get fieldUsageData(): ProcessDefinitionFieldUsageData {
        return this._fieldUsageData;
    }

    constructor(
        private readonly _options: ILayoutOMOptions
    ) { }

    private _getField(fieldId: string): ProcessField {
        if (this.fieldsMap) {
            return this.fieldsMap[fieldId];
        }

        return null;
    }

    private _createChildWorkItemType(callback?: (workItemTypeId: string) => void): void {
        const addWITData: CreateProcessWorkItemTypeRequest = {
            description: this._options.getWorkItemType().description,
            name: this._options.getWorkItemType().name,
            inheritsFrom: this._options.getWorkItemType().referenceName,
            color: this._options.getWorkItemType().color,
            icon: this._options.getWorkItemType().icon,
            isDisabled: this._options.getWorkItemType().isDisabled
        };

        Utils.getProcessClient().createProcessWorkItemType(addWITData, this._options.getProcess().processTypeId).then(
            (witResponse: ProcessWorkItemType) => {
                // store the child work item type in case one of the later REST calls fail
                this._options.getWorkItemType().referenceName = witResponse.referenceName;
                this._options.getWorkItemType().name = witResponse.name;
                this._options.getWorkItemType().description = witResponse.description;
                this._options.getWorkItemType().inherits = witResponse.inherits;
                this._options.getWorkItemType().customization = witResponse.customization;
                if ($.isFunction(callback)) {
                    callback(witResponse.referenceName);
                }
            },
            (witError) => {
                this._options.setError(witError.message);
                this._options.hideBusyOverlay();
            });
    }

    public Page = new PageOM(this._options, this._createChildWorkItemType.bind(this));

    public Group = new GroupOM(this._options, this._createChildWorkItemType.bind(this));

    public Control = new ControlOM(
        this._options,
        this._processFieldHelper,
        this._getField.bind(this),
        () => this.fieldUsageData,
    );

    public Field = new FieldOM(
        this._options,
        this._processFieldHelper,
        this._getField.bind(this),
        () => this.fieldUsageData,
        this._createChildWorkItemType.bind(this),
    );

}
