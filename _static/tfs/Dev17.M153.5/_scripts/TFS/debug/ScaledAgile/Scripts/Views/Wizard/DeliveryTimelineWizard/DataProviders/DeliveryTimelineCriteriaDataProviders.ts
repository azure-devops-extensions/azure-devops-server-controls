import Q = require("q");
import Ajax = require("Presentation/Scripts/TFS/TFS.Legacy.Ajax");

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { BaseDataProvider } from "ScaledAgile/Scripts/Shared/DataProviders/BaseDataProvider";
import { ItemManager } from "ScaledAgile/Scripts/Shared/DataProviders/ItemManager";
import { IFieldDefinition } from "ScaledAgile/Scripts/Shared/Models/IItem";
import { CoreField, FieldType } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";

import * as TFS_OM_Common from "Presentation/Scripts/TFS/TFS.OM.Common";
import * as TFS_TagService from "Presentation/Scripts/TFS/FeatureRef/TFS.TagService";
import * as TFS_BoardService from "Presentation/Scripts/TFS/FeatureRef/TFS.BoardService";

export interface IDeliveryTimelineCriteriaDataProviders {
    /**
    * Get fields collection scope.
    * @return {IPromise<IFieldDefinition[]>} promise of fields definition.
    */
    getFieldsAsync(): IPromise<IFieldDefinition[]>;

    /**
    * Get allowed values for a specified field id
    * @param {FieldType} fieldType - field type
    * @param {number} fieldId - field id.
    * @return {IPromise<IFieldDefinition[]>} promise of allowed values
    */
    getAllowedValuesAsync(fieldType: FieldType, fieldId: number): IPromise<string[]>;
}

export class DeliveryTimelineCriteriaDataProviders extends BaseDataProvider implements IDeliveryTimelineCriteriaDataProviders {
    private _allowedValueCache: IDictionaryStringTo<string[]>;  // use string as dictionary key as per bug#797545

    constructor() {
        super();
        this._allowedValueCache = {};
    }

    public getFieldsAsync(): IPromise<IFieldDefinition[]> {
        return new ItemManager(null).beginGetFields();
    }

    public getAllowedValuesAsync(fieldType: FieldType, fieldId: number): IPromise<string[]> {

        const fieldIdKey = fieldId.toString();
        if (this._allowedValueCache.hasOwnProperty(fieldIdKey)) {
            return Q(this._allowedValueCache[fieldIdKey]);
        }
        else {
            if (fieldId === FieldType.Boolean) {
                return Q(["True", "False"]);
            }
            else if (fieldId === CoreField.Tags) {
                return this._getTagsAsync(fieldIdKey);
            }
            else if (fieldId === CoreField.BoardColumn) {
                return this._getBoardColumnNamesAsync(fieldIdKey);
            }
            else if (fieldId === CoreField.BoardLane) {
                return this._getBoardLaneNamesAsync(fieldIdKey);
            }
            else {
                return this._getAllowedValuesAsyncInternal(fieldIdKey);
            }
        }
    }

    private _getBoardColumnNamesAsync(fieldId: string): IPromise<string[]> {
        let deferred = Q.defer<string[]>();

        const boardService = TFS_OM_Common.ProjectCollection.getConnection(TfsContext.getDefault()).getService(TFS_BoardService.BoardService) as TFS_BoardService.BoardService;
        boardService.beginGetColumnSuggestedValues(null,
            (values: string[]) => {
                this._allowedValueCache[fieldId] = values;
                deferred.resolve(values);
            },
            (error: TfsError) => {
                deferred.reject(error);
            });

        return deferred.promise;
    }

    private _getBoardLaneNamesAsync(fieldId: string): IPromise<string[]> {
        let deferred = Q.defer<string[]>();

        const boardService = TFS_OM_Common.ProjectCollection.getConnection(TfsContext.getDefault()).getService(TFS_BoardService.BoardService) as TFS_BoardService.BoardService;
        boardService.beginGetRowSuggestedValues(null,
            (values: string[]) => {
                this._allowedValueCache[fieldId] = values;
                deferred.resolve(values);
            },
            (error: TfsError) => {
                deferred.reject(error);
            });

        return deferred.promise;
    }

    private _getAllowedValuesAsyncInternal(fieldId: string): IPromise<string[]> {
        let deferred = Q.defer<string[]>();

        Ajax.getMSJSON(
            this._getApiLocation("allowedValues", { fieldId: fieldId }),
            null,
            (allowedValues: string[]) => {
                this._allowedValueCache[fieldId] = allowedValues;
                deferred.resolve(allowedValues);
            },
            (error: TfsError) => {
                deferred.reject(error);
            }
        );
        
        return deferred.promise;
    }

    private _getTagsAsync(fieldIdKey: string): IPromise<string[]> {
        const tfsContext = TfsContext.getDefault();
        const tagService = TFS_OM_Common.ProjectCollection.getConnection(tfsContext).getService(TFS_TagService.TagService) as TFS_TagService.TagService;
        const projectScope = tfsContext.contextData.project.id;

        let deferred = Q.defer<string[]>();

        tagService.beginQueryTagNames(
            [TFS_TagService.TagService.WORK_ITEM_ARTIFACT_KIND],
            projectScope,  // Query tags for the current project.
            (tags: string[]) => {
                this._allowedValueCache[fieldIdKey] = tags;
                deferred.resolve(tags);
            },
            (error: any) => {
                deferred.reject(error);
            }
        );

        return deferred.promise;
    }

    private _getApiLocation(action?: string, params?: any): string {
        return TfsContext.getDefault().getActionUrl(action || "", "wit", $.extend({ project: "", team: "", area: "api" }, params));
    }
}
