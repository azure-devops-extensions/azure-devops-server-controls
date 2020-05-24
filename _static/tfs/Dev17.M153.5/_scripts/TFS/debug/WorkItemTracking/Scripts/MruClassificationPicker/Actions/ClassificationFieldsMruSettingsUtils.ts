import { getService, ISettingsService, SettingsUserScope } from "VSS/Settings/Services";
import { subtract, unique } from "VSS/Utils/Array";
import { toNativePromise } from "VSSPreview/Utilities/PromiseUtils";
import { IClassificationFieldsMru } from "WorkItemTracking/Scripts/MruClassificationPicker/Models/ClassificationFieldsMru";

export interface IClassificationFieldsMruSettingsUtils {
    readMru(projectId: string): Promise<IDictionaryStringTo<any>>;
    parseMru(projectId: string, data: IDictionaryStringTo<any>): IClassificationFieldsMru;
    getMru(projectId: string): Promise<IClassificationFieldsMru>;
    updateAreaPathMru(projectId: string, newValues: number[]): Promise<number[]>;
    updateIterationPathMru(projectId: string, newValues: number[]): Promise<number[]>;
}

namespace ClassificationFieldsMruSettingKeys {
    export const SettingsKey = "ClassificationFieldsMru";
    export const AreaPathMruKey = "AreaPath";
    export const IterationPathMruKey = "IterationPath";
    export const MruLength = 5;
}

export class ClassificationFieldsMruSettingsUtils implements IClassificationFieldsMruSettingsUtils {

    private _settingsService: ISettingsService;

    constructor(){
        this._settingsService = getService();
    }

    public readMru(projectId: string): Promise<IDictionaryStringTo<any>> {
        return toNativePromise(
            this._settingsService.getEntriesAsync(
                ClassificationFieldsMruSettingKeys.SettingsKey,
                SettingsUserScope.Me,
                "project",
                projectId)
        );
    }

    public parseMru(projectId: string, data: IDictionaryStringTo<any>): IClassificationFieldsMru {
        return {
            projectId: projectId,
            areaPathMru: (data && data.value && data.value[ClassificationFieldsMruSettingKeys.AreaPathMruKey]) || [],
            iterationPathMru: (data && data.value && data.value[ClassificationFieldsMruSettingKeys.IterationPathMruKey]) || []
        };
    }

    public getMru(projectId: string): Promise<IClassificationFieldsMru> {
        return this.readMru(projectId).then((data: IDictionaryStringTo<any>) => {
            return this.parseMru(projectId, data);
        });
    }

    public updateAreaPathMru(projectId: string, values: number[]): Promise<number[]> {

        //  Read the latest mru so that we don't overwrite using stale mru.
        return this.getMru(projectId).then((mruValues: IClassificationFieldsMru) => {
            const newValues = this._buildNewMru(mruValues.areaPathMru, values);

            const newEntries: IDictionaryStringTo<number[]> = {};
            newEntries[`${ClassificationFieldsMruSettingKeys.SettingsKey}/${ClassificationFieldsMruSettingKeys.AreaPathMruKey}`] = newValues;

            return toNativePromise(
                this._settingsService.setEntries(
                newEntries,
                SettingsUserScope.Me,
                "project",
                projectId).then(() => newValues)
            );
        });
    }

    public updateIterationPathMru(projectId: string, values: number[]): Promise<number[]> {

        //  Read the latest mru so that we don't overwrite using stale mru.
        return this.getMru(projectId).then((mruValues: IClassificationFieldsMru) => {
            const newValues = this._buildNewMru(mruValues.iterationPathMru, values);

            const newEntries: IDictionaryStringTo<number[]> = {};
            newEntries[`${ClassificationFieldsMruSettingKeys.SettingsKey}/${ClassificationFieldsMruSettingKeys.IterationPathMruKey}`] = newValues;

            return toNativePromise(
                this._settingsService.setEntries(
                    newEntries,
                    SettingsUserScope.Me,
                    "project",
                    projectId).then(() => newValues)
            );
        });
    }

    private _buildNewMru(oldMru: number[], values: number[]) {
        if (!values || values.length === 0) {
            return oldMru;
        }
        const uniqueValues = unique(values);
        const filteredOldMru = subtract(oldMru, uniqueValues);
        const newMru = uniqueValues.concat(filteredOldMru);
        newMru.splice(ClassificationFieldsMruSettingKeys.MruLength, newMru.length - ClassificationFieldsMruSettingKeys.MruLength);

        return newMru;
    }
}
