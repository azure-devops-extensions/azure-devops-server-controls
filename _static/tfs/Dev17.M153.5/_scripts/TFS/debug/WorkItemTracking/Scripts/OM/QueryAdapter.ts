import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import Diag = require("VSS/Diag");
import Resources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");
import { WITIdentityControlHelpers } from "WorkItemTracking/Scripts/TFS.WorkItemTracking.Helpers";
import Service = require("VSS/Service");
import * as TFS_BoardService_Async from "Presentation/Scripts/TFS/FeatureRef/TFS.BoardService";
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import TFS_Service = require("Presentation/Scripts/TFS/TFS.Service");
import TFS_TagService = require("Presentation/Scripts/TFS/FeatureRef/TFS.TagService");
import Utils_Array = require("VSS/Utils/Array");
import Utils_Culture = require("VSS/Utils/Culture");
import Utils_Date = require("VSS/Utils/Date");
import Utils_Number = require("VSS/Utils/Number");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import VSS = require("VSS/VSS");
import WITCommonResources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking.Common");
import WITConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import WiqlOperators = require("WorkItemTracking/Scripts/OM/WiqlOperators");
import { FieldUsages, FieldFlags, Exceptions } from "WorkItemTracking/Scripts/OM/WorkItemConstants";
import { LinkQueryMode } from "WorkItemTracking/Scripts/OM/QueryConstants";
import { IFilter, IFilterGroup, IClause, IEditInfo, IQuerySortColumn } from "WorkItemTracking/Scripts/OM/QueryInterfaces";
import { INode, INodeStructureType } from "Presentation/Scripts/TFS/FeatureRef/TFS.AgileCommon";
import { IFieldEntry, IWorkItemLinkTypeEnd, IWorkItemCategory } from "WorkItemTracking/Scripts/OM/WorkItemInterfaces";
import { WebPageDataService } from "VSS/Contributions/Services";
import { parseCurrentIteration, parseTeamAreas } from "WorkItemTracking/Scripts/OM/WiqlValues";

function Error_invalidQuerySyntax(details: any, node: any): Error {
    return WITOM.createError(Utils_String.format(Resources.InvalidQuerySyntax, details, node), { name: Exceptions.InvalidQuerySyntaxException, details: details, node: node });
};

function Error_invalidQueryFilterRow(messageFormat: string, rowIndex: number): Error {
    return WITOM.createError(Utils_String.format(messageFormat, rowIndex), { name: Exceptions.InvalidQueryFilterRowException, rowIndex: rowIndex });
};

export class QueryAdapter extends TFS_Service.TfsService {

    public store: WITOM.WorkItemStore;
    public queryableFields: any;
    public availableOperators: any;
    public availableFieldValues: any;
    public oneHopLinkTypes: any;
    public recursiveLinkTypes: any;
    public getLocalizedOperator: (invariantOperator: string) => string;
    public getInvariantOperator: (localizedOperator: string) => string;
    public isGroupOperator: (localizedOperator: string) => boolean;
    public isInOperator: (localizedOperator: string) => boolean;
    public isMultipleValueOperator: (localizedOperator: string) => boolean;
    public isFieldComparisonOperator: (localizedOperator: string) => boolean;
    public isMeMacro: (macro: string, localized: boolean) => boolean;
    public isProjectMacro: (macro: string, localized: boolean) => boolean;
    public isOrOperator: (operator: string, localized: boolean) => boolean;
    public isIdentityFieldStringOperator: (localizedOperator: string) => boolean;

    constructor() {
        super();

        this.availableOperators = {};
        this.availableFieldValues = {};
    }

    public initializeConnection(tfsConnection: Service.VssConnection) {
        super.initializeConnection(tfsConnection);
        this.store = tfsConnection.getService<WITOM.WorkItemStore>(WITOM.WorkItemStore);
    }

    public getInvariantFieldName(localizedFieldName: string, throwError: boolean): string {
        let field: IFieldEntry;
        localizedFieldName = $.trim(localizedFieldName);
        field = this.getField(localizedFieldName);

        if (field) {
            return field.referenceName;
        }
        else if (!throwError) {
            return localizedFieldName;
        }
        else {
            throw Error_invalidQuerySyntax(Resources.QueryReferencesFieldThatDoesNotExist, localizedFieldName);
        }
    }

    public getInvariantFieldValue(invariantFieldName: string, invariantOperator: string, localizedValue: string): string {
        let isEmpty: boolean;
        let values: string[];
        let fieldType: number;
        let isMacro: boolean;
        let isDateTime: boolean;
        let isInteger: boolean;
        let isNumber: boolean;
        let isBoolean: boolean;
        let linkTypeEnd: IWorkItemLinkTypeEnd;
        let num: number;
        let invariantValue = "";
        let localDate: Date;
        let year: number;


        if (localizedValue !== null && localizedValue !== undefined) { // if value is null or undefined we will return
            localizedValue = $.trim(localizedValue);
            isEmpty = localizedValue ? false : true;

            if (invariantOperator === WiqlOperators.WiqlOperators.OperatorIn || invariantOperator === WiqlOperators.WiqlOperators.OperatorNotIn) {
                values = [];
                if (this.getField(invariantFieldName).isIdentity) {
                    values = WITIdentityControlHelpers.parseIdentityListString(localizedValue);
                } else {
                    values = localizedValue.split(",").filter(v => !!v);
                }
                values = values.map(v => this.getInvariantFieldValue(invariantFieldName, "", v));
                invariantValue = "(" + values.join(",") + ")";
            }
            else if (Utils_String.ignoreCaseComparer(invariantFieldName, "System.LinkType") === 0) {
                try {
                    linkTypeEnd = this.store.findLinkTypeEnd(localizedValue);
                }
                catch (e) {
                    throw Error_invalidQuerySyntax(e.message, localizedValue);
                }

                invariantValue = WiqlOperators.quoteString(linkTypeEnd.immutableName);
            }
            else if (isEmpty) {
                invariantValue = "''";
            } else {
                fieldType = this.getFieldType(null, invariantFieldName);

                isMacro = Utils_String.startsWith(localizedValue, WiqlOperators.WiqlOperators.MacroStart);

                if (isMacro) {

                    if (FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.CurrentIterationRequireTeamParameter)) {
                        const parts = parseCurrentIteration(localizedValue);
                        if (parts) {
                            if (parts && !parts.team) {
                                throw Error_invalidQuerySyntax(Resources.ErrorExpectingTeam, localizedValue);
                            } else {
                                const { offset, team } = parts;
                                const offsetStr = offset > 0 ? ` + ${offset}` : offset < 0 ? ` - ${-offset}` : "";
                                const teamStr = team ? `('${team}')` : "";
                                return `${WiqlOperators.WiqlOperators.MacroCurrentIteration}${teamStr}${offsetStr}`;
                            }
                        }
                    }

                    if (FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.TeamAreasMacro)) {
                        const parts = parseTeamAreas(localizedValue);
                        if (parts) {
                            if (parts && !parts.team) {
                                throw Error_invalidQuerySyntax(Resources.ErrorExpectingTeam, localizedValue);
                            } else {
                                const { team } = parts;
                                const teamStr = team ? `('${team}')` : "";
                                return `${WiqlOperators.WiqlOperators.MacroTeamAreas}${teamStr}`;
                            }
                        }
                    }

                    if (WiqlOperators.isValidMacro(localizedValue, true)) {
                        invariantValue = WiqlOperators.getInvariantOperator(localizedValue);
                    }
                    else {
                        throw Error_invalidQuerySyntax(Utils_String.format(Resources.QueryFilterInvalidMacro, localizedValue), localizedValue);
                    }
                }
                else {
                    isDateTime = fieldType === WITConstants.FieldType.DateTime;
                    isInteger = fieldType === WITConstants.FieldType.Integer;
                    isNumber = fieldType === WITConstants.FieldType.Double;
                    isBoolean = fieldType === WITConstants.FieldType.Boolean;

                    if (isDateTime) {
                        localDate = Utils_Date.parseDateString(localizedValue, undefined, true); //ignore time zone
                        if (localDate === null || isNaN(<any>localDate)) {
                            throw Error_invalidQuerySyntax(Resources.ErrorExpectingDateTime, localizedValue);
                        }

                        year = localDate.getFullYear();

                        if (year < 1753 || year > 9999) {
                            throw Error_invalidQuerySyntax(Resources.ErrorDateTimeValueOutOfRange, localizedValue);
                        }

                        invariantValue = WiqlOperators.quoteString(WiqlOperators.toInvariantDateString(localDate));
                    }
                    else if (isInteger) {
                        if (!/^-?[0-9]+?$/.test(localizedValue)) {
                            throw Error_invalidQuerySyntax(Resources.ErrorExpectingIntegerValue, localizedValue);
                        }

                        invariantValue = localizedValue;
                    }
                    else if (isNumber) {
                        num = Number(localizedValue);
                        if (isNaN(num)) {
                            throw Error_invalidQuerySyntax(Resources.ErrorExpectingNumericValue, localizedValue);
                        }
                        else {
                            invariantValue = Utils_Number.toDecimalLocaleString(num, false, Utils_Culture.getInvariantCulture());
                        }
                    }
                    else if (isBoolean) {
                        if (/^true$/i.test(localizedValue)) {
                            invariantValue = "true";
                        } else if (/^false$/i.test(localizedValue)) {
                            invariantValue = "false";
                        } else if (/^[0-9]+?$/.test(localizedValue)) {
                            invariantValue = parseInt(localizedValue, 10) ? "true" : "false";
                        } else {
                            throw Error_invalidQuerySyntax(Resources.ErrorExpectingBooleanValue, localizedValue);
                        }
                    } else {
                        invariantValue = WiqlOperators.quoteString(localizedValue);
                    }
                }
            }
        }

        return invariantValue;
    }

    public processClause(clause: IClause): IClause {
        if (this._fieldSupportsAnySyntax(null, clause.fieldName)) {
            return this._convertFromSpecialAnySyntax(clause);
        }

        return clause;
    }

    public beginEnsureFields(callback: (field: WITOM.FieldDefinition[]) => void, errorCallback?: IErrorCallback) {
        this.store.beginGetFields(callback, errorCallback);
    }

    public beginGetOneHopLinkTypes(callback: IResultCallback, errorCallback?: IErrorCallback) {
        VSS.queueRequest(this, this, "oneHopLinkTypes", callback, errorCallback, (succeeded: IResultCallback, failed: IErrorCallback) => {
            this.store.beginGetLinkTypes(() => {
                succeeded(this.store.getLinkTypeEnds());
            }, failed);
        });
    }

    public beginGetRecursiveLinkTypes(callback: IResultCallback, errorCallback?: IErrorCallback) {
        VSS.queueRequest(this, this, "recursiveLinkTypes", callback, errorCallback, (succeeded: IResultCallback, failed: IErrorCallback) => {
            this.store.beginGetLinkTypes(() => {
                succeeded($.map(this.store.getLinkTypeEnds(), (lte) => {
                    if (lte.isForwardLink && Utils_String.ignoreCaseComparer(lte.linkType.topology, "tree") === 0) {
                        return lte;
                    }
                }));
            }, failed);
        });
    }

    public beginGetQueryableFields(project: WITOM.Project, callback: IResultCallback, errorCallback?: IErrorCallback) {

        const key = "queryableFields" + (project != null ? project.guid : "");

        VSS.queueRequest(this, this, key, callback, errorCallback, (succeeded: IResultCallback, failed: IErrorCallback) => {

            if (!project) {
                this.store.beginGetFields((fields) => {
                    succeeded(this._prepareQueryableFields(fields));
                }, failed);
            }
            else {
                const fields: WITOM.FieldDefinition[] = [];

                $.each(project.fieldIds, (i, fieldId: number) => {
                    // Filter out 'team project' field since we are already scoped to a team project.
                    if (fieldId != WITConstants.CoreField.TeamProject) {
                        fields[fields.length] = project.store.getFieldDefinition(fieldId);
                    }
                });
                succeeded(this._prepareQueryableFields(fields));
            }
        });
    }

    public beginGetAvailableOperators(localizedFieldName: string, callback: IResultCallback, errorCallback?: IErrorCallback) {
        let key: string;

        localizedFieldName = $.trim(localizedFieldName);
        key = localizedFieldName.toLocaleUpperCase();

        if (key) {
            VSS.queueRequest(this, this.availableOperators, key, callback, errorCallback, (succeeded: IResultCallback, failed: IErrorCallback) => {
                this.store.beginGetFields((fields) => {
                    succeeded(this._prepareAvailableOperators(localizedFieldName));
                }, failed);
            });
        }
        else if ($.isFunction(callback)) {
            callback.call(this, []);
        }
    }

    public getField(fieldName: string): WITOM.FieldDefinition {
        return this.store.getFieldDefinition(fieldName);
    }

    public areFieldsLoaded() {
        return Boolean(this.store.fieldMap);
    }

    public getFieldType(field: WITOM.FieldDefinition, fieldName?: string): WITConstants.FieldType {
        /// <param name="fieldName" type="string" optional="true" />

        field = field || (fieldName ? this.getField(fieldName) : null);

        if (field) {
            if (field.id === WITConstants.CoreField.TeamProject) {
                return WITConstants.FieldType.Internal;
            }

            return field.type;
        }

        return WITConstants.FieldType.String;
    }

    public beginGetAvailableFieldValues(project: WITOM.Project, localizedFieldName: string, localizedOperator: string, includePredefinedValues: boolean, scopeAllowedValuesToProject: boolean, callback: IResultCallback, errorCallback?: IErrorCallback) {

        localizedFieldName = $.trim(localizedFieldName);

        if (localizedFieldName) {
            localizedOperator = $.trim(localizedOperator);
            const invariantOperator = WiqlOperators.getInvariantOperator(localizedOperator).toUpperCase();
            const key = (project ? project.id : 0) + "|" + localizedFieldName.toLocaleUpperCase() + "|" + localizedOperator.toLocaleUpperCase() + "|" + (scopeAllowedValuesToProject ? "scoped" : "unscoped") + (includePredefinedValues ? "|includesPredefined" : "");

            VSS.queueRequest(this, this.availableFieldValues, key, callback, errorCallback, (succeeded: IResultCallback, failed: IErrorCallback) => {
                this.store.beginGetFields((fields) => {
                    const field = this.getField(localizedFieldName);

                    if (!field) {
                        succeeded([]);
                    } else {
                        const fieldType = this.getFieldType(field);

                        if (fieldType === WITConstants.FieldType.TreePath) {
                            project.nodesCacheManager.beginGetNodes().then(() => {
                                const result: INode[] = [];

                                // Use unique ids
                                let id = 0;
                                const toNode = (text: string): INode => ({ id: --id, name: text, guid: text, children: [], structure: INodeStructureType.Project });
                                if (field.id === WITConstants.CoreField.IterationPath && includePredefinedValues &&
                                    (
                                        invariantOperator === WiqlOperators.WiqlOperators.OperatorEqualTo ||
                                        invariantOperator === WiqlOperators.WiqlOperators.OperatorNotEqualTo ||
                                        invariantOperator === WiqlOperators.WiqlOperators.OperatorUnder ||
                                        invariantOperator === WiqlOperators.WiqlOperators.OperatorNotUnder
                                    )) {
                                    const nodeText = WiqlOperators.getLocalizedOperator(WiqlOperators.WiqlOperators.MacroCurrentIteration);
                                    result.push(toNode(nodeText));
                                    if (FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.CurrentIterationOffset)) {
                                        result.push(toNode(nodeText + " + 1"));
                                        result.push(toNode(nodeText + " - 1"));
                                    }
                                } else if (
                                    field.id === WITConstants.CoreField.AreaPath &&
                                    includePredefinedValues &&
                                    FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.TeamAreasMacro) &&
                                    (
                                        invariantOperator === WiqlOperators.WiqlOperators.OperatorEqualTo ||
                                        invariantOperator === WiqlOperators.WiqlOperators.OperatorNotEqualTo
                                    )
                                ) {
                                    const areasText = WiqlOperators.getLocalizedOperator(WiqlOperators.WiqlOperators.MacroTeamAreas);
                                    result.push(toNode(areasText));
                                }
                                if (field.id === WITConstants.CoreField.AreaPath) {
                                    result.push(project.nodesCacheManager.getAreaNode(true));
                                } else {
                                    result.push(project.nodesCacheManager.getIterationNode(true));
                                }

                                succeeded(result);
                            }, failed);
                        } else if (fieldType === WITConstants.FieldType.Boolean) {
                            succeeded(["True", "False"]);
                        } else if (WiqlOperators.isFieldComparisonOperator(localizedOperator)) {
                            this.beginGetQueryableFields(scopeAllowedValuesToProject ? project : null, (queryableFieldNames: string[]) => {
                                const result: string[] = [];
                                $.each(queryableFieldNames, (i: number, fname: string) => {
                                    if (Utils_String.localeIgnoreCaseComparer(fname, localizedFieldName) !== 0 &&
                                        fieldType === this.getFieldType(null, fname)) {
                                        result.push(fname);
                                    }
                                });

                                succeeded(result);
                            }, failed);
                        } else if (field.id === WITConstants.CoreField.Tags) {
                            const tagService = <TFS_TagService.TagService>TFS_OM_Common.ProjectCollection.getConnection(this.getTfsContext()).getService(TFS_TagService.TagService);
                            tagService.beginQueryTagNames(
                                [TFS_TagService.TagService.WORK_ITEM_ARTIFACT_KIND],
                                project.guid,
                                tagNames => succeeded(tagNames),
                                (error: any) => {
                                    if (error.type === "Microsoft.TeamFoundation.Framework.Server.AccessCheckException") {
                                        succeeded([]); // when we don't have permissions to enumerate tags, simply return an empty array
                                    } else {
                                        failed(error);
                                    }
                                }
                            );
                        } else if (field.id === WITConstants.CoreField.BoardColumn) {
                            VSS.using(["Presentation/Scripts/TFS/FeatureRef/TFS.BoardService"], (TFS_BoardService: typeof TFS_BoardService_Async) => {
                                const boardService = <TFS_BoardService_Async.BoardService>TFS_OM_Common.ProjectCollection.getConnection(this.getTfsContext()).getService(TFS_BoardService.BoardService);
                                boardService.beginGetColumnSuggestedValues(scopeAllowedValuesToProject ? project.guid : null, succeeded, failed);
                            });
                        } else if (field.id === WITConstants.CoreField.BoardLane) {
                            VSS.using(["Presentation/Scripts/TFS/FeatureRef/TFS.BoardService"], (TFS_BoardService: typeof TFS_BoardService_Async) => {
                                const boardService = <TFS_BoardService_Async.BoardService>TFS_OM_Common.ProjectCollection.getConnection(this.getTfsContext()).getService(TFS_BoardService.BoardService);
                                boardService.beginGetRowSuggestedValues(scopeAllowedValuesToProject ? project.guid : null, succeeded, failed);
                            });
                        } else if (WITOM.isIdentityPickerSupportedForField(field)) {
                            const macroValues = this._getPredefinedFieldValues(field, fieldType);
                            this.store.beginGetAllowedValues(field.id, null, null, (allowedValues: string[]) => {
                                const items = allowedValues.concat(macroValues);
                                succeeded(items);
                            }, failed);
                        } else if (field.id === WITConstants.CoreField.TeamProject) {

                            this.store.beginGetProjects(function (projects: WITOM.Project[]) {
                                const allProjects: string[] = $.map(projects, function (project, index) { return project.name; });
                                succeeded(allProjects);
                            }, failed);
                        } else if (field.id === WITConstants.CoreField.Id) {
                            const callbackParams = [WiqlOperators.getLocalizedOperator(WiqlOperators.WiqlOperators.MacroFollows)];
                            if (this._isRecentMentionsMacroEnabled()) {
                                callbackParams.push(WiqlOperators.getLocalizedOperator(WiqlOperators.WiqlOperators.MacroRecentMentions));
                            }
                            if (this._isMyRecentActivityMacroEnabled()) {
                                callbackParams.push(WiqlOperators.getLocalizedOperator(WiqlOperators.WiqlOperators.MacroMyRecentActivity));
                            }
                            if (this._isRecentProjectActivityMacroEnabled()) {
                                callbackParams.push(WiqlOperators.getLocalizedOperator(WiqlOperators.WiqlOperators.MacroRecentProjectActivity));
                            }
                            succeeded(callbackParams);
                        } else {
                            if (WiqlOperators.isGroupOperator(invariantOperator) && field.id === WITConstants.CoreField.WorkItemType) {
                                    this.store.beginGetWorkItemCategories(project, (categories: IDictionaryStringTo<IWorkItemCategory>) => {
                                        const categoryNames: string[] = [];

                                        $.each(categories, (refName, category) => {
                                            categoryNames.push(category.referenceName);
                                        });

                                        categoryNames.sort(Utils_String.localeIgnoreCaseComparer);

                                        succeeded(categoryNames);
                                    }, failed);
                            } else {
                                this.store.beginGetAllowedValues(field.id, scopeAllowedValuesToProject ? project.guid : null, null, (allowedValues: string[]) => {
                                    if (includePredefinedValues) {
                                        allowedValues = (this._getPredefinedFieldValues(field, fieldType) || []).concat(allowedValues);
                                    }

                                    succeeded(allowedValues);
                                }, failed);
                            }
                        }
                    }
                }, failed);
            });
        } else if ($.isFunction(callback)) {
            callback.call(this, []);
        }
    }

    public beginGenerateWiql(editInfo: IEditInfo, columns: string[], sortColumns: IQuerySortColumn[], callback: IResultCallback, errorCallback?: IErrorCallback) {

        this.store.beginGetLinkTypes(() => {
            this.beginEnsureFields(() => {
                const wiql: string[] = [];
                let filter: string;
                let orderBy: string;
                let mode: string;

                try {
                    wiql.push(this._generateSelectClause(columns));

                    if (editInfo.mode <= LinkQueryMode.WorkItems) {
                        wiql.push("FROM WorkItems");
                    }
                    else {
                        wiql.push("FROM WorkItemLinks");
                    }

                    filter = $.trim(this._generateFilter(editInfo));
                    if (filter) {
                        wiql.push("WHERE " + filter);
                    }

                    orderBy = this._generateOrderByClause(sortColumns, LinkQueryMode.isLinkQuery(editInfo.mode));
                    if (orderBy) {
                        wiql.push(orderBy);
                    }

                    mode = this._getModeClause(editInfo.mode);
                    if (mode) {
                        wiql.push(mode);
                    }

                    if ($.isFunction(callback)) {
                        callback.call(this, wiql.join(" "));
                    }
                }
                catch (e) {
                    VSS.handleError(e, errorCallback, this);
                }
            }, errorCallback);
        }, errorCallback);
    }

    private _fieldSupportsAnySyntax(field: WITOM.FieldDefinition, fieldName?: string): boolean {
        /// <param name="fieldName" type="string" optional="true" />

        field = field || (fieldName ? this.getField(fieldName) : null);

        return field && WiqlOperators.isNonNullableField(field.id);
    }

    private _convertFromSpecialAnySyntax(clause: IClause): IClause {
        let value: string;
        if (clause.value) {
            value = clause.value.replace(/[\s'"()]+$/, "").replace(/^[\s'"()]+/, "");

            if (Utils_String.localeIgnoreCaseComparer(value, WITCommonResources.WiqlOperators_Any) === 0 && WiqlOperators.getInvariantOperator(clause.operator) === WiqlOperators.WiqlOperators.OperatorEqualTo) {
                return <IClause>($.extend({}, clause, { operator: WiqlOperators.getLocalizedOperator(WiqlOperators.WiqlOperators.OperatorNotEqualTo), value: "" }));
            }
        }

        return clause;
    }

    private _prepareQueryableFields(fields: WITOM.FieldDefinition[]): string[] {
        let field: WITOM.FieldDefinition;
        const queryableFields: string[] = [];
        const workItemUsage = FieldUsages.WorkItem;

        for (let i = 0, l = fields.length; i < l; i++) {
            field = fields[i];

            if (field.checkFlag(FieldFlags.Queryable) && !field.checkFlag(FieldFlags.Ignored) && (field.usages & workItemUsage)) {
                queryableFields[queryableFields.length] = field.name;
            }
        }

        queryableFields.sort(Utils_String.localeIgnoreCaseComparer);

        return queryableFields;
    }

    private _prepareAvailableOperators(localizedFieldName: string): string[] {
        const field: WITOM.FieldDefinition = this.getField(localizedFieldName);
        const fieldType: WITConstants.FieldType = this.getFieldType(field);
        const invariantOps: string[] = [];

        if (field && field.referenceName === WITConstants.CoreFieldRefNames.Tags) {
            // tags is not a real plain text field like the field api says it is
            const { OperatorContains, OperatorNotContains } = WiqlOperators.WiqlOperators;
            invariantOps.push(...[OperatorContains, OperatorNotContains]);
        } else {
            switch (fieldType) {
                case 0:
                    Utils_Array.addRange(invariantOps, WiqlOperators.ProjectOperators);
                    break;
                case WITConstants.FieldType.String:
                    Utils_Array.addRange(invariantOps, field && field.supportsTextQuery() ? 
                    WiqlOperators.StringWithTextSupportOperators :
                    field && field.id === WITConstants.CoreField.WorkItemType ?
                            WiqlOperators.StringWithInGroupOperators :
                            WiqlOperators.StringOperators);
                    break;
                case WITConstants.FieldType.Integer:
                case WITConstants.FieldType.DateTime:
                case WITConstants.FieldType.Double:
                    Utils_Array.addRange(invariantOps, WiqlOperators.ComparisonOperators);
                    break;
                case WITConstants.FieldType.PlainText:
                case WITConstants.FieldType.Html:
                    Utils_Array.addRange(invariantOps, field && field.supportsTextQuery() ? WiqlOperators.TextWithTextSupportOperators : WiqlOperators.TextOperators);
                    break;
                case WITConstants.FieldType.History:
                    Utils_Array.addRange(invariantOps, field && field.supportsTextQuery() ? WiqlOperators.HistoryWithTextSupportOperators : WiqlOperators.HistoryOperators);
                    break;
                case WITConstants.FieldType.TreePath:
                    Utils_Array.addRange(invariantOps, WiqlOperators.TreePathOperators);
                    break;
                case WITConstants.FieldType.Boolean:
                case WITConstants.FieldType.Guid:
                    Utils_Array.addRange(invariantOps, WiqlOperators.EqualityOperators);
                    break;
            }
        }

        const isComputed: boolean = field ? field.checkFlag(FieldFlags.Computed) : false;

        if (!isComputed && WiqlOperators.FieldTypesSupportingEver.hasOwnProperty(<any>fieldType)) {
            invariantOps.push(WiqlOperators.WiqlOperators.OperatorEver);
        }

        const availableOps: string[] = WiqlOperators.getLocalizedOperatorList(invariantOps);

        if (WiqlOperators.FieldTypesSupportingFieldComparison.hasOwnProperty(<any>fieldType)) {
            $.each(invariantOps, function (i, op) {
                if (WiqlOperators.OperatorsSupportingFieldComparison.hasOwnProperty(op.toUpperCase())) {
                    availableOps.push(WiqlOperators.getFieldComparisonOperator(op));
                }
            });
        }

        return availableOps;
    }

    private _getPredefinedFieldValues(field: WITOM.FieldDefinition, fieldType: WITConstants.FieldType): string[] {
        switch (fieldType) {
            case 0:
                return [WiqlOperators.getLocalizedOperator(WiqlOperators.WiqlOperators.MacroProject)];
            case WITConstants.FieldType.DateTime:
                return [WiqlOperators.getLocalizedOperator(WiqlOperators.WiqlOperators.MacroToday), WiqlOperators.getLocalizedTodayMinusMacro(1), WiqlOperators.getLocalizedTodayMinusMacro(7), WiqlOperators.getLocalizedTodayMinusMacro(30)];
            case WITConstants.FieldType.String:
                if (field.isIdentity) {
                    return [WiqlOperators.getLocalizedOperator(WiqlOperators.WiqlOperators.MacroMe)];
                }
                else if (this._fieldSupportsAnySyntax(field)) {
                    return [WITCommonResources.WiqlOperators_Any];
                }
                return [];
            default:
                return [];
        }
    }

    private _checkOperator(localizedFieldName: string, localizedOperator: string, rowIndex: number) {
        let asynch = true;
        let error: Error;
        this.beginGetAvailableOperators(localizedFieldName, function (operators: string[]) {
            asynch = false;
            if (operators && operators.length) {
                if (!Utils_Array.contains(operators, $.trim(localizedOperator), Utils_String.localeIgnoreCaseComparer)) {
                    error = Error_invalidQueryFilterRow(Resources.QueryFilterErrorUnrecognizedOperator, rowIndex + 1);
                }
            }
        },
            function (e: Error) {
                asynch = false;
                error = e;
            });

        Diag.Debug.assert(!asynch, "Fields are not ready yet.");

        if (error) {
            throw error;
        }
    }

    private _generateSelectClause(columns: string[]): string {
        if (columns && columns.length) {
            return "SELECT " + $.map(columns, function (column) { return "[" + column + "]"; }).join(",");
        }
        else {
            return "SELECT [System.Id]";
        }
    }

    public _generateFilterExpression(filter: IFilter, prefix: string, teamProject: string): string {
        const clauses: IClause[] = [];
        const filterString: string[] = [];
        let groups = filter.groups;
        let index: number;
        let addParen: boolean = false;

        if (filter.clauses) {
            //clone groups first
            groups = groups && $.map(groups, (g) => { return $.extend({}, g); });

            index = 0;

            $.each(filter.clauses, (i, clause) => {
                const fieldName = $.trim(clause.fieldName);

                if (fieldName) {
                    const operator = $.trim(clause.operator);
                    if (!operator) {
                        throw Error_invalidQueryFilterRow(Resources.QueryFilterErrorMissingOperator, clause.index + 1);
                    }

                    if (!$.trim(clause.value)) {
                        if (this.isFieldComparisonOperator(operator) ||
                            Utils_String.ignoreCaseComparer(WiqlOperators.WiqlOperators.OperatorIn, WiqlOperators.getInvariantOperator(operator)) === 0 ||
                            Utils_String.ignoreCaseComparer(WiqlOperators.WiqlOperators.OperatorNotIn, WiqlOperators.getInvariantOperator(operator)) === 0 ||
                            this.getFieldType(null, fieldName) === WITConstants.FieldType.Boolean) {
                            throw Error_invalidQueryFilterRow(Resources.QueryFilterErrorEmptyValue, clause.index + 1);
                        }
                    }

                    clauses.push(<IClause>$.extend({}, clause, { index: index, originalIndex: clause.index }));
                    index++;
                }
                else if (groups && groups.length) {
                    groups = Utils_UI.updateFilterGroups(groups, index + 1, false);
                }
            });
        }

        // basic logic should be:
        //  If 'teamProject' is NOT empty and NOT '[Any]' then
        //      If there are only 'ANDs' at the top level add the team project clause to the filter string (don't forget the prefix)
        //      else Add the team project clause and add an open paren, add a close paren at the end in this case.
        //  Else do nothing
        if (teamProject) {
            if (!this._isProjectInTopLevelAndAllAnds(filter, teamProject)) {
                let teamProjectClause: string = "";
                let teamProjectName: string;

                if (this.isProjectMacro(teamProject, false)) {
                    teamProjectName = teamProject;
                } else {
                    teamProjectName = WiqlOperators.quoteString(teamProject);
                }

                if (prefix) {
                    teamProjectClause = "[" + prefix + "].";
                }

                teamProjectClause += "[" + WITConstants.CoreFieldRefNames.TeamProject + "] = " + teamProjectName;

                if (clauses.length > 0) {
                    teamProjectClause += " AND";

                    if (!this._isTopLevelAndsOnly(filter)) {
                        addParen = true;
                        teamProjectClause += " (";
                    }
                }

                filterString.push(teamProjectClause);
            }
        }

        $.each(clauses, (i: number, clause: IClause) => {
            const clauseString: string[] = [];
            let parens = "";
            let localizedFieldName: string;
            let localizedOperator: string;
            let localizedValue: string;
            let invariantFieldName: string;
            let invariantOperator: string;
            let invariantValue: string;
            let rightFieldName: string;

            if (i > 0) {
                clauseString.push(this.getInvariantOperator(clause.logicalOperator));
            }

            if (groups && groups.length) {
                $.each(groups, (i, g) => {
                    if (g.start === (clause.index + 1)) {
                        parens += "(";
                    }
                });

                if (parens) {
                    clauseString.push(parens);
                }
            }

            clause = this.processClause(clause);

            localizedFieldName = clause.fieldName;
            localizedOperator = clause.operator;
            localizedValue = clause.value;

            invariantFieldName = this.getInvariantFieldName(localizedFieldName, true); //will throw syntax exception
            this._checkOperator(localizedFieldName, localizedOperator, clause.originalIndex); //will throw syntax exception
            invariantOperator = this.getInvariantOperator(localizedOperator);

            if (this.isFieldComparisonOperator(localizedOperator)) {
                rightFieldName = this.getInvariantFieldName(localizedValue, true); //will throw syntax exception

                if (prefix) {
                    invariantValue = "[" + prefix + "].[" + rightFieldName + "]";
                }
                else {
                    invariantValue = "[" + rightFieldName + "]";
                }
            } else if (
                invariantOperator === WiqlOperators.WiqlOperators.OperatorIsEmpty ||
                invariantOperator === WiqlOperators.WiqlOperators.OperatorIsNotEmpty
            ) {
                invariantValue = "";
            } else {
                invariantValue = this.getInvariantFieldValue(invariantFieldName, invariantOperator, localizedValue);
            }

            if (prefix) {
                clauseString.push("[" + prefix + "].[" + invariantFieldName + "]");
            }
            else {
                clauseString.push("[" + invariantFieldName + "]");
            }

            clauseString.push(invariantOperator);
            clauseString.push(invariantValue);

            if (groups && groups.length) {
                parens = "";
                $.each(groups, (i, g) => {
                    if (g.end === (clause.index + 1)) {
                        parens += ")";
                    }
                });

                if (parens) {
                    clauseString.push(parens);
                }
            }

            filterString.push(clauseString.join(" "));
        });

        let retval = filterString.join(" ");

        if (addParen) {
            retval = retval + ")";
        }

        return retval;
    }

    public _isTopLevelAndsOnly(filter: IFilter): boolean {

        if (!filter || !filter.clauses) {
            return true;
        }

        let retval = true;

        $.each(filter.clauses, (i, clause: IClause) => {
            const logicalOperator = this.getInvariantOperator(clause.logicalOperator);

            if (this.isOrOperator(logicalOperator, false) &&
                this._doesLogicalOperatorApplyToTopLevelOfQuery(clause, filter.groups)) {
                retval = false;
                return false;
            }
        });

        return retval;
    }

    public _isProjectInTopLevelAndAllAnds(filter: IFilter, teamProject: string): boolean {
        if (!filter || !filter.clauses) {
            return false;
        }

        let retval = false;

        $.each(filter.clauses, (i, clause: IClause) => {
            const logicalOperator = this.getInvariantOperator(clause.logicalOperator);

            if (this.isOrOperator(logicalOperator, false) &&
                this._doesLogicalOperatorApplyToTopLevelOfQuery(clause, filter.groups)) {
                retval = false;
                return false;
            }
            else if (!this.isOrOperator(logicalOperator, false) &&
                this._doesLogicalOperatorApplyToTopLevelOfQuery(clause, filter.groups) &&
                this.getInvariantOperator(clause.operator) === WiqlOperators.WiqlOperators.OperatorEqualTo &&
                this.getInvariantFieldName(clause.fieldName, false) === WITConstants.CoreFieldRefNames.TeamProject &&
                (this.isProjectMacro(clause.value, true) ||
                    Utils_String.localeIgnoreCaseComparer(clause.value, teamProject) === 0)) {
                retval = true;
            }
        });

        return retval;
    }


    private _doesLogicalOperatorApplyToTopLevelOfQuery(clause: IClause, groups: IFilterGroup[]): boolean {
        let retval = true;

        // The filter grid control changes the indexes (enumerates over them
        // and sets them to a linear set of values which is 0-based instead of 1-based.
        // TODO:  We should fix this, it should not be changing the datasource in this way.
        const clauseIndex = clause.index + 1;

        $.each(groups, (i, group: IFilterGroup) => {
            if (clauseIndex > group.start && clauseIndex <= group.end) {
                retval = false;
                return false;
            }
        });

        return retval;
    }

    private _generateLinkFilter(linkTypes: string): string {
        let linkTypeEndNames: string[] = [];

        if (linkTypes) {
            $.each(linkTypes.split(","), (i: number, v: string) => {
                let linkTypeEnd: IWorkItemLinkTypeEnd;
                v = $.trim(v);

                if (Utils_String.localeIgnoreCaseComparer(v, WITCommonResources.WiqlOperators_Any) === 0) {
                    linkTypeEndNames = ["[System.Links.LinkType] <> ''"];
                    return false;
                }
                else {
                    try {
                        linkTypeEnd = this.store.findLinkTypeEnd(v);
                        linkTypeEndNames.push("[System.Links.LinkType] = " + WiqlOperators.quoteString(linkTypeEnd.immutableName));
                    }
                    catch (e) {
                        throw Error_invalidQuerySyntax(e.message, v);
                    }
                }
            });
        }

        return linkTypeEndNames.join(" OR ");
    }

    private _generateFilter(editInfo: IEditInfo): string {
        let targetFilter: IFilter;
        let linkTypes: string;
        let filterText: string;
        let whereClause: string[];
        if (LinkQueryMode.isLinkQuery(editInfo.mode)) {
            if (LinkQueryMode.isTreeQuery(editInfo.mode)) {
                targetFilter = editInfo.treeTargetFilter;
                linkTypes = editInfo.treeLinkTypes;
            }
            else {
                targetFilter = editInfo.linkTargetFilter;
                linkTypes = editInfo.linkTypes;
            }

            whereClause = [];

            filterText = $.trim(this._generateFilterExpression(editInfo.sourceFilter, "Source", editInfo.teamProject));
            if (filterText) {
                whereClause.push("(" + filterText + ")");
            }

            filterText = $.trim(this._generateLinkFilter(linkTypes));
            if (filterText) {
                whereClause.push("(" + filterText + ")");
            }

            filterText = $.trim(this._generateFilterExpression(targetFilter, "Target", editInfo.teamProject));
            if (filterText) {
                whereClause.push("(" + filterText + ")");
            }

            return whereClause.join(" AND ");
        }
        else {
            return $.trim(this._generateFilterExpression(editInfo.sourceFilter, "", editInfo.teamProject));
        }
    }

    private _generateOrderByClause(sortColumns: IQuerySortColumn[], isLinkQuery: boolean): string {
        let sc = sortColumns;

        if (!isLinkQuery) {
            if (sortColumns && sortColumns.length) {
                sc = [];
                $.each(sortColumns, function (i, column) {
                    if (Utils_String.ignoreCaseComparer(column.name, "System.Links.LinkType") !== 0) {
                        sc.push(column);
                    }
                });
            }
        }

        if (sc && sc.length) {
            return "ORDER BY " + $.map(sc, function (column) {
                return "[" + column.name + "]" + (column.descending ? " DESC" : "");
            }).join(",");
        }

        return "";
    }

    private _getModeClause(mode: number): string {
        switch (mode) {
            case LinkQueryMode.LinksMustContain:
                return "mode(MustContain)";
            case LinkQueryMode.LinksMayContain:
                return "mode(MayContain)";
            case LinkQueryMode.LinksDoesNotContain:
                return "mode(DoesNotContain)";
            case LinkQueryMode.LinksRecursive:
                return "mode(Recursive)";
            case LinkQueryMode.LinksRecursiveReturnMatchingChildren:
                return "mode(Recursive, ReturnMatchingChildren)";
        }

        return "";
    }

    private _isRecentMentionsMacroEnabled() {
        const pageDataService = Service.getService(WebPageDataService);
        const features = pageDataService.getPageData(WITConstants.WorkItemFeatureStateConstants.DataProviderName) as any;
        return features && features.recentMentionsMacro;
    }

    private _isMyRecentActivityMacroEnabled() {
        const pageDataService = Service.getService(WebPageDataService);
        const features = pageDataService.getPageData(WITConstants.WorkItemFeatureStateConstants.DataProviderName) as any;
        return features && features.myRecentActivityMacro;
    }

    private _isRecentProjectActivityMacroEnabled() {
        const pageDataService = Service.getService(WebPageDataService);
        const features = pageDataService.getPageData(WITConstants.WorkItemFeatureStateConstants.DataProviderName) as any;
        return features && features.recentProjectActivityMacro;
    }
}

VSS.initClassPrototype(QueryAdapter, {
    store: null,
    queryableFields: null,
    availableOperators: null,
    availableFieldValues: null,
    oneHopLinkTypes: null,
    recursiveLinkTypes: null,
    getLocalizedOperator: WiqlOperators.getLocalizedOperator,
    getInvariantOperator: WiqlOperators.getInvariantOperator,
    isGroupOperator: WiqlOperators.isGroupOperator,
    isInOperator: WiqlOperators.isInOperator,
    isMultipleValueOperator: WiqlOperators.isMultipleValueOperator,
    isFieldComparisonOperator: WiqlOperators.isFieldComparisonOperator,
    isMeMacro: WiqlOperators.isMeMacro,
    isIdentityFieldStringOperator: WiqlOperators.isIdentityFieldStringOperator,
    isProjectMacro: WiqlOperators.isProjectMacro,
    isOrOperator: WiqlOperators.isOrOperator
});
