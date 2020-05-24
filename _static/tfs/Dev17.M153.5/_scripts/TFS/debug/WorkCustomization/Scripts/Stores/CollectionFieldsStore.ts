import * as BaseStore from "VSS/Flux/Store";
import * as WorkContracts from "TFS/WorkItemTracking/Contracts";
import { getCollectionService } from "VSS/Service";
import { PageDataService } from "WorkCustomization/Scripts/WebApi/PageDataService";
import { endGetCollectionFieldsAction, IEndGetCollectionFieldsPayload, fieldsCacheReloaded } from "WorkCustomization/Scripts/Actions/CollectionFieldsActions";
import { updateFilterAction, IFilterUpdatePayload } from "WorkCustomization/Scripts/Common/Actions/ProcessAdminFilterActions";
import { FieldUtils } from "WorkCustomization/Scripts/Utils/CommonUtils";
import { IWorkCustomizationHubData } from "WorkCustomization/Scripts/Contracts/WorkCustomizationHubData";
import { autobind } from "OfficeFabric/Utilities";

export interface ICollectionFieldsDataStoreOptions {
    fields: WorkContracts.WorkItemField[],
    fieldAllowedValues: IDictionaryStringTo<string[]>
}

export class CollectionFieldsStore extends BaseStore.Store {
    private _fields: WorkContracts.WorkItemField[];
    private _hasDeleteFieldPermission: boolean;
    private _filter: string;

    private _refNameToField: IDictionaryStringTo<WorkContracts.WorkItemField>;
    private _nameToField: IDictionaryStringTo<WorkContracts.WorkItemField>;
    private _allowedValues: IDictionaryStringTo<string[]>;
    private _isReady: boolean = false;

    constructor(options?: ICollectionFieldsDataStoreOptions) {
        super();
        this._initialize(options);
        this._addListeners();
    }

    get isReady(): boolean {
        return this._isReady;
    }

    public static filterFields(fields: WorkContracts.WorkItemField[], filter: string): WorkContracts.WorkItemField[] {
        if (fields != null && filter != null && filter != '') {
            return fields.filter(f => f.name.toLocaleLowerCase().indexOf(filter.toLocaleLowerCase()) !== -1 ||
                f.referenceName.toLocaleLowerCase().indexOf(filter.toLocaleLowerCase()) !== -1 ||
                WorkContracts.FieldType[f.type].toLocaleLowerCase().indexOf(filter.toLocaleLowerCase()) !== -1);
        }
        else {
            return fields;
        }
    }

    get fields(): WorkContracts.WorkItemField[] {
        return CollectionFieldsStore.filterFields(this._fields, this._filter);
    }

    public hasDeleteFieldPermission(): boolean {
        return this._hasDeleteFieldPermission;
    }

    public getFieldAllowedValues(fieldRefName: string): string[] {
        if (!this._allowedValues) {
            return null;
        }

        let allowedValues = this._allowedValues[fieldRefName];

        return allowedValues == null ? null : allowedValues;
    }

    public getFieldByReferenceNameOrName(refNameOrName: string): WorkContracts.WorkItemField {
        let field: WorkContracts.WorkItemField = null;
        if (this._fields) {
            field = this._refNameToField[refNameOrName] || this._nameToField[refNameOrName];
        }

        return field;
    }

    public dispose(): void {
        this._removeListeners();
    }

    private _initialize(options: ICollectionFieldsDataStoreOptions): void {
        if (options) {
            if (options.fields) {
                this._fields = options.fields;
                this._buildFieldMaps();
            }
            if (options.fieldAllowedValues) {
                this._allowedValues = options.fieldAllowedValues;
            }
        }

        if (this._fields && this._allowedValues) {
            this._isReady = true;
        }
    }

    private _addListeners(): void {
        endGetCollectionFieldsAction.addListener(this._onFieldsLoaded);
        fieldsCacheReloaded.addListener(this._onFieldCacheReloaded);
        updateFilterAction.addListener(this._onfilterChanged);
    }

    private _removeListeners(): void {
        endGetCollectionFieldsAction.removeListener(this._onFieldsLoaded);
        fieldsCacheReloaded.removeListener(this._onFieldCacheReloaded);
        updateFilterAction.removeListener(this._onfilterChanged);
    }

    @autobind
    private _onfilterChanged(payload: IFilterUpdatePayload): void {
        this._filter = payload.filterValue;
        this.emitChanged();
    }

    @autobind
    private _onFieldCacheReloaded(payload: IWorkCustomizationHubData) {
        this._initialize({
            fields: payload.fields,
            fieldAllowedValues: payload.allowedValues
        });
    }

    @autobind
    private _onFieldsLoaded(payload: IEndGetCollectionFieldsPayload): void {
        this._fields = payload.fields.filter((field: WorkContracts.WorkItemField) => {
            if (FieldUtils.isSystemField(field.referenceName) && !FieldUtils.isCoreField(field.referenceName)) {
                return false;
            }

            return true;
        });
        this._hasDeleteFieldPermission =
            // If permission has not been determined, assuming user has permission, we'll check the permission on delete call anyways
            payload.hasDeleteFieldPermission == null ? true
                : payload.hasDeleteFieldPermission;

        this._buildFieldMaps();

        this._isReady = true;
        this.emitChanged();
    }

    private _buildFieldMaps(): void {
        this._refNameToField = {};
        this._nameToField = {};
        this._fields.forEach((field: WorkContracts.WorkItemField) => {
            this._refNameToField[field.referenceName] = field;
            this._nameToField[field.name] = field;
        });
    }
}

var store: CollectionFieldsStore;

export function getCollectionFieldsStore(options?: ICollectionFieldsDataStoreOptions): CollectionFieldsStore {
    if (!store) {

        if (!options) {
            let pageDataService: PageDataService = getCollectionService(PageDataService);
            let fields = pageDataService.getFields();
            let allowedValues = pageDataService.getAllowedValues();
            options = { fields: fields, fieldAllowedValues: allowedValues };
        }

        store = new CollectionFieldsStore(options);
    }

    return store;
}

export function disposeStore(): void {
    store.dispose();
    store = null;
}