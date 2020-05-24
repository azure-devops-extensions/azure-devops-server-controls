import BuildContracts = require("TFS/Build/Contracts");


/**
 * Template view model
 */
export class TemplateDefinitionViewModel {
    private _template: BuildContracts.BuildDefinitionTemplate;
    private _deleteFunctionCallBack: () => void;

    public id: string = "";
    public friendlyName: string = "";
    public description: string = "";
    public canDelete: boolean;
    public iconUrl: string;
    public deleteFunction: (template: BuildContracts.BuildDefinitionTemplate) => IPromise<any>;

    constructor(template: BuildContracts.BuildDefinitionTemplate, deleteFunction: (template: BuildContracts.BuildDefinitionTemplate) => IPromise<any>, deleteFunctionCallBack: () => void, iconUrl?: string) {
        this._template = template;
        this.deleteFunction = deleteFunction;
        this._deleteFunctionCallBack = deleteFunctionCallBack;
        this.iconUrl = iconUrl || "";

        this.id = template.id;
        this.friendlyName = template.name;
        this.description = template.description;
        this.canDelete = template.canDelete;
    }

    public deleteCommand(): IPromise<any> {
        if ($.isFunction(this.deleteFunction) && $.isFunction(this._deleteFunctionCallBack)) {
            return this.deleteFunction(this._template).then(this._deleteFunctionCallBack);
        }
    }
}
