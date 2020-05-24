import { WidgetTelemetry } from 'Widgets/Scripts/VSS.Widget.Telemetry';
import * as Q from 'q';
import { SettingsField } from 'Dashboards/Scripts/SettingsField';
import ServerConstants = require('Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants');
import WITConstants = require('Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants');
import { ProjectCollection } from 'Presentation/Scripts/TFS/TFS.OM.Common';
import Context = require('VSS/Context');
import * as Controls from 'VSS/Controls';
import Filters = require('VSS/Controls/Filters');
import Utils_Array = require('VSS/Utils/Array');
import Utils_String = require('VSS/Utils/String');
import { WorkItemFieldDescriptor } from 'Widgets/Scripts/Burndown/BurndownDataContract';
import { FieldFilter } from 'Widgets/Scripts/Burndown/BurndownSettings';
import { FieldCriteriaHelper } from 'Widgets/Scripts/Burndown/FieldCriteriaHelper';
import {
    AnalyticsFieldsFilterControl,
    AnalyticsFieldsFilterControlOptions,
} from 'Widgets/Scripts/Controls/FieldFilter/AnalyticsFieldsFilterControl';
import { AnalyticsPredicateConfiguration } from 'Widgets/Scripts/Controls/FieldFilter/AnalyticsPredicateConfiguration';
import { WitFieldsQuery } from 'Widgets/Scripts/Controls/FieldFilter/WitFieldsQuery';
import { WidgetsCacheableQueryService } from 'Widgets/Scripts/DataServices/WidgetsCacheableQueryService';
import * as WidgetResources from 'Widgets/Scripts/Resources/TFS.Resources.Widgets';
import { WiqlOperators } from 'WorkItemTracking/Scripts/OM/WiqlOperators';
import WITOM = require('WorkItemTracking/Scripts/TFS.WorkItemTracking');
import { IConfigurationControl } from 'Widgets/Scripts/ModernWidgetTypes/ModernConfigurationBase';
import * as VSS_Diag from "VSS/Diag";

//This needs to be decoupled from burndown.

export interface AnalyticsFilterScope {
    projectId: string;
    workItemTypes: string[];
}

export interface AnalyticsFilterBlockOptions {
    initialFilters: FieldFilter[];
    onChange(): void;
}


/**
 * This is a factoring container for a filter-row in widget Configuration scenario, as opposed to other UI containers.
 * Acts as an Adapter for usage contract impedance mismatches of VSS Field Controls, at least until Field Filter Control is well-factored to our liking.
 */
export class AnalyticsFilterBlock extends Controls.Control<AnalyticsFilterBlockOptions> implements IConfigurationControl<FieldFilter[], AnalyticsFilterScope> {
    private control: AnalyticsFieldsFilterControl;
    private settingsField: SettingsField<Controls.Control<any>>; //Settings Field contains JQuery composition, not a VSS control.
    private predicateConfig: AnalyticsPredicateConfiguration;
    private $labelledContent: JQuery;
    private latestContext: AnalyticsFilterScope;

    public initializeOptions(options: AnalyticsFilterBlockOptions) {
        super.initializeOptions($.extend({
            coreCssClass: "analytics-filter-block"
        }, options));
    }

    public initialize() {
        this.$labelledContent = $("<div>");
        // Field Criteria label
        this.settingsField = SettingsField.createSettingsFieldForJQueryElement({
            labelText: WidgetResources.BurndownConfig_FieldCriteriaHeader,
            hasErrorField: true
        }, this.$labelledContent, this.getElement());

        // Description text
        $("<div>").addClass("bowtie field-criteria-subheading").text(WidgetResources.BurndownConfig_FieldCriteriaTooltip).appendTo(this.$labelledContent);

        this.latestContext = {} as AnalyticsFilterScope;
    }

    public renderFilterControl(scope: AnalyticsFilterScope, filters: FieldFilter[]): IPromise<void> {
        // Only allow fields which are both supported by WIT, and recognized by AX for the active configuration
        // Only consider the current context project.
        let clause = this.generateFilterControlFormat(filters);
        let getAnalyticsFieldsPromise = FieldCriteriaHelper.getAllowedFieldDescriptors(scope.projectId, scope.workItemTypes);
        let cacheService = ProjectCollection.getDefaultConnection().getService(WidgetsCacheableQueryService);
        let webContext = Context.getDefaultWebContext();
        let getWitFieldsPromise = cacheService.getCacheableQueryResult(new WitFieldsQuery(webContext.project.id));

        return Q.spread<any, void>([getAnalyticsFieldsPromise, getWitFieldsPromise],
            (allowedAxFields: WorkItemFieldDescriptor[], witFields: WITOM.FieldDefinition[]) =>
                this.createControl(allowedAxFields, witFields, clause),
            (reason: any) => {
                Q.reject(reason);
            });
    }

    private createControl(allowedAxFields: WorkItemFieldDescriptor[], witFields: WITOM.FieldDefinition[], clause: Filters.IFilter | Filters.IFilterClause) {
        this.predicateConfig = new AnalyticsPredicateConfiguration();

        let configSettings: AnalyticsFieldsFilterControlOptions = {
            predicateConfig: this.predicateConfig,
            supportedFieldsDefinitions: this.assembleSupportedFields(witFields, allowedAxFields),

            //Presentational options.
            enableRowAddRemove: true,
            allowZeroRows: true,
            propogateControlBlur: true,
            enableGrouping: false,
            hideLogicalOperator: true,
            hideOperatorHeader: true,
            appendAddRemoveColumn: true,
            maxClauseCount: 10,
            onError: (error: Error) => { /*No-op for now. hook in with Config UI.*/ },
            onChange: () => { this._options.onChange(); }
        };

        if (this.control) {
            this.control.dispose();
        }

        this.control = AnalyticsFieldsFilterControl.create(AnalyticsFieldsFilterControl, this.$labelledContent, configSettings);
        this.control.setFilter(clause);
    }

    public setContext(context: AnalyticsFilterScope): IPromise<void> {
        // Modifying internal state of metadata on filter control to account for config changes requires internals changes to base types.
        // For now, reinstantiate the control if we are in this circumstance.
        if ((context.projectId === this.latestContext.projectId)
            || !Utils_Array.arrayEquals(
                context.workItemTypes,
                this.latestContext.workItemTypes,
                (s, t) => s === t,
                false /* null result */,
                false /* sorted */)
        ) {
            let filters = (this.control != null)
                ? this.getSettings()
                : this._options.initialFilters

            return this.renderFilterControl(context, filters);
        }
        return Q.resolve<void>(null);
    }

    /**
     *
     * @param fields FieldDefinitions from WIT for the current context project.
     * @param allowedAxFields WorkItemFieldDescriptor from analytics for the current context project.
     */
    private assembleSupportedFields(fields: WITOM.FieldDefinition[], allowedAxFields: WorkItemFieldDescriptor[]): WITOM.FieldDefinition[] {

        let supportedFieldsDefinitions = this.filterSupportedFields(fields, allowedAxFields);

        Utils_Array.uniqueSort<WITOM.FieldDefinition>(supportedFieldsDefinitions, (a: WITOM.FieldDefinition, b: WITOM.FieldDefinition) => {
            return Utils_String.localeIgnoreCaseComparer(a.name, b.name);
        });
        return supportedFieldsDefinitions;

    }

    private isFieldTypeAllowed(type: WITConstants.FieldType): boolean {
        return this.predicateConfig.getSupportedFieldTypes().indexOf(type) >= 0;
    }

    private filterSupportedFields(fieldDefinitions: WITOM.FieldDefinition[], allowedAxFields: WorkItemFieldDescriptor[]): WITOM.FieldDefinition[] {
        return fieldDefinitions.filter((fieldDefinition: WITOM.FieldDefinition, index: number) => {
            let supported = fieldDefinition.isQueryable()
                && this.isFieldTypeAllowed(fieldDefinition.type)
                && !fieldDefinition.isIdentity
                && (!this.predicateConfig.isFieldOmittedAsUnhelpful(fieldDefinition.referenceName));

            // Unfortunately the WIT fields query isn't scoped to the relevant work item type(s), like the analytics equivalent is.
            // And, for whatever reason, fieldDefinition.workItemType is always null. If we figure this out we may be able to eliminate the need
            // for the analytics query and intersection we do here. Until then, we need this.
            let axSupported = allowedAxFields.some(o => o.FieldReferenceName === fieldDefinition.referenceName);
            return supported && axSupported;
        });
    }

    // Handles conversion of settings to our simpler FieldFilter Format
    public getSettings(): FieldFilter[] {
        if (this.control) {
            let filters = this.control.getFilters();
            return filters.clauses.map((value) => {
                let filter: FieldFilter = {
                    fieldName: value.fieldName,
                    queryOperation: value.operator,
                    queryValue: value.value
                };
                return filter;
            });
        }

        return null;
    }

    //Express settings from our local FieldFilter Format to VSS IFilter
    public generateFilterControlFormat(fieldFilter: FieldFilter[]): Filters.IFilter | Filters.IFilterClause {
        if (fieldFilter && fieldFilter.length > 0) {
            return {
                clauses: fieldFilter.map((filterValue, index) => {
                    let clause: Filters.IFilterClause = {
                        fieldName: filterValue.fieldName,
                        index: index,
                        logicalOperator: WiqlOperators.OperatorAnd,
                        operator: filterValue.queryOperation,
                        value: filterValue.queryValue
                    }
                    return clause;
                })
            }
        } else {
            return AnalyticsFieldsFilterControl.generateDefaultClause();
        }
    }

    public validate(): string {
        let error = null;
        if (this.control) {
            error = this.control.getFirstErrorMessage();
        }
        if (error) {
            this.settingsField.showError(error);
        } else {
            this.settingsField.hideError();
        }
        return error;
    }
}