import { IGroup } from "OfficeFabric/GroupedList";

import { IErrorState, ITemplateDefinition, IYamlTemplateDefinition, IYamlTemplateItem, ITemplatesPayload } from "DistributedTaskControls/Common/Types";
import * as StoreCommonBase from "DistributedTaskControls/Common/Stores/Base";
import { getYamlTemplateItem } from "DistributedTaskControls/Common/Templates";
import * as Actions from "DistributedTaskControls/Actions/TemplateActions";
import { StoreKeys } from "DistributedTaskControls/Common/Common";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { FilteringUtils } from "DistributedTaskControls/Common/FilteringUtils";
import { Telemetry, Feature, Properties } from "DistributedTaskControls/Common/Telemetry";

import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";

export class TemplatesStore extends StoreCommonBase.StoreBase {

    constructor() {
        super();
        this._templates = [];
        this._templatesGroup = [];
        this._resetErrorState();
    }

    public initialize(): void {
        this._templateActions = ActionsHubManager.GetActionsHub<Actions.TemplateActions>(Actions.TemplateActions);
        this._templateActions.updateTemplateList.addListener(this._handleUpdateTemplateList);
        this._templateActions.filterTemplateList.addListener(this._handleFilterTemplates);
        this._templateActions.showTemplateErrorMessage.addListener(this._handleShowTemplateErrorMessage);
        this._templateActions.dismissTemplateErrorMessage.addListener(this._handleDismissTemplateErrorMessage);
    }

    protected disposeInternal(): void {
        this._templateActions.updateTemplateList.removeListener(this._handleUpdateTemplateList);
        this._templateActions.filterTemplateList.removeListener(this._handleFilterTemplates);
        this._templateActions.showTemplateErrorMessage.removeListener(this._handleShowTemplateErrorMessage);
        this._templateActions.dismissTemplateErrorMessage.removeListener(this._handleDismissTemplateErrorMessage);
    }

    private _handleUpdateTemplateList = (templatePayload: ITemplatesPayload) => {
        this._refreshTemplates(templatePayload.templates);
        this._completeTemplatesList = this._templates ? Utils_Array.clone<ITemplateDefinition>(this._templates) : [];
        if (this._lastFilter && !!templatePayload.preserveFilter) {
            // Preserve filtering if there was any before refresh of templates, 
            // as in case of delete custom template.
            let filteredList = FilteringUtils.performFilteringWithScore<ITemplateDefinition>(
                this._completeTemplatesList, this._completeTemplatesList,
                this._lastFilter, null, this._getMatchScore);
            this._refreshTemplates(filteredList);
        }
        this.emitChanged();
    }

    private _handleFilterTemplates = (filter: string) => {
        let filteredList = FilteringUtils.performFilteringWithScore<ITemplateDefinition>(
            this._templates, this._completeTemplatesList,
            filter, this._lastFilter, this._getMatchScore);
        if (filteredList) {
            this._refreshTemplates(filteredList);
            this.emitChanged();
        }
        this._lastFilter = filter;

        let filteredListItemCount: number = filteredList ? filteredList.length : 0;
        this._publishFilteredTemplateTelemetry(filteredListItemCount);
    }

    private _handleShowTemplateErrorMessage = (errorState: IErrorState) => {
        this._templateErrorState = errorState;
        this.emitChanged();
    }

    private _handleDismissTemplateErrorMessage = () => {
        this._resetErrorState();
        this.emitChanged();
    }

    public static getKey(): string {
        return StoreKeys.TemplatesStore;
    }

    public getYamlTemplateItem(): IYamlTemplateItem {
        return getYamlTemplateItem();
    }

    public getTemplateList(): ITemplateDefinition[] {
        return this._templates;
    }

    public getTemplateGroups(): IGroup[] {
        return this._templatesGroup;
    }

    public getFilterText(): string {
        return this._lastFilter;
    }

    public getTemplateErrorState(): IErrorState {
        return this._templateErrorState;
    }

    private _refreshTemplates(templates: ITemplateDefinition[]) {

        this._templates = [];
        this._templatesGroup = [];

        let templateGroups = this._toDictionary<ITemplateDefinition, ITemplateDefinition>(templates, (templateDefinition) => templateDefinition.groupId);
        let startIndex = 0;

        for (let key in templateGroups) {
            if (templateGroups.hasOwnProperty(key)) {
                let templateGroup: IGroup = {
                    key: key,
                    name: key,
                    startIndex: startIndex,
                    count: templateGroups[key].length
                };

                this._templatesGroup.push(templateGroup);
                this._templates = this._templates.concat(templateGroups[key]);

                startIndex = startIndex + templateGroups[key].length;
            }
        }
    }

    private _toDictionary<TArray, TValue>(
        array: TArray[],
        getKey: (item: TArray, index: number) => string,
        getValue?: (item: TArray, index: number) => TValue
    ): IDictionaryStringTo<TValue[]> {

        let lookup: IDictionaryStringTo<TValue[]> = {};
        array = array || [];

        array.forEach((item: TArray, index: number) => {
            let key = getKey(item, index);
            if (key) {
                let value: TValue;
                if (getValue) {
                    value = getValue(item, index);
                }
                else {
                    value = <any>item;
                }

                if (lookup[key]) {
                    lookup[key].push(value);
                }
                else {
                    lookup[key] = [];
                    lookup[key].push(value);
                }
            }
        });
        return lookup;
    }

    private _getMatchScore(item: ITemplateDefinition, filter: string, performExactMatch?: boolean): number {
        let nameToCompare = item.name || Utils_String.empty;
        let descriptionToCompare = item.description || Utils_String.empty;
        return FilteringUtils.getStringMatchScore(filter, [nameToCompare, descriptionToCompare], performExactMatch);
    }

    private _resetErrorState(): void {
        this._templateErrorState = {
            errorMessage: Utils_String.empty,
            errorStatusCode: null
        } as IErrorState;
    }

    private _publishFilteredTemplateTelemetry(count: number): void {
        let eventProperties: IDictionaryStringTo<any> = {};

        eventProperties[Properties.Length] = count;

        Telemetry.instance().publishEvent(Feature.TemplatesInSearch, eventProperties);
    }

    private _lastFilter: string = Utils_String.empty;
    private _completeTemplatesList: ITemplateDefinition[];
    private _templates: ITemplateDefinition[];
    private _templatesGroup: IGroup[];
    private _templateErrorState: IErrorState;

    private _templateActions: Actions.TemplateActions;
}