import AgileResources = require("Agile/Scripts/Resources/TFS.Resources.Agile");
import {ITeamClassificationRecord, ITeamAreaRecord, ITeamIterationRecord, IClassificationValidationResult} from "Agile/Scripts/Admin/Interfaces";
import Utils_String = require("VSS/Utils/String");
import Utils_Date = require("VSS/Utils/Date");
import Diag = require("VSS/Diag");

/** Manages CRUD operations for classification nodes. Raises events to listeners on change. */
export class TeamClassificationDataManager<T extends ITeamClassificationRecord> {
    /**
     * Path separator string
     */
    public static PATH_SEPARATOR = "\\";

    protected _idMap: IDictionaryNumberTo<T>;
    public items: T[];
    /**
     * Constructor
     * @param items The classification records to prime the data manager with
     * @param changeHandler The change handler to invoke when data changes
     */
    public constructor(items: T[], protected changeHandler: IFunctionPR<T[], void>) {
        this.items = $.extend(true, [], items);
        this._idMap = {};
        for (var i = 0, l = items.length; i < l; i++) {
            this._checkForDuplicateId(items[i].id);
            this._idMap[items[i].id] = items[i];
        }
    }

    /**
     * Return true if the given path is descendant of the given prefix path
     * @param path path to check if it is descendant.
     * @param rootPath root path to check for descendants.
     */
    public static isDescendantPath(path: string, rootPath: string): boolean {
        var rootPathPrefix = rootPath + TeamClassificationDataManager.PATH_SEPARATOR;
        return !Utils_String.equals(path, rootPath, true)
            && Utils_String.startsWith(path, rootPathPrefix, Utils_String.localeIgnoreCaseComparer);
    }

    /**
     * Add a classification to the data manager
     * @param classification The classification to add
     */
    public add(classification: T) {
        this.addAtIndex(classification, this.items.length);
    }
    
    /**
     * Add a classification to the data manager
     * @param classification The classification to add
     */
    public addAtIndex(classification: T, index: number) {
        Diag.Debug.assert(index >= 0, "Cannot insert at negative index!");
        this._checkForDuplicateId(classification.id);
        this.items = this.items.slice(0, index).concat([classification], this.items.slice(index));
        this._idMap[classification.id] = classification;
        this._raiseDataChanged();
    }


    /**
     * Remove a classification from the data manager
     * @param id The id of the classification to remove
     */
    public remove(id: string) {
        for (var i = 0, l = this.items.length; i < l; i++) {
            if (this.items[i].id === id) {
                this.items.splice(i, 1);
                delete this._idMap[id];
                this._raiseDataChanged();
                break;
            }
        }
    }

    /**
     * Update a classification in the data manager
     * @param classification The latest classification data to use
     */
    public update(classification: T) {
        var id = classification.id;
        var matchFound = false;
        for (var i = 0, l = this.items.length; i < l; i++) {
            if (this.items[i].id === id) {
                this.items.splice(i, 1, classification);
                this._idMap[classification.id] = classification;
                this._raiseDataChanged();
                matchFound = true;
                break;
            }
        }
        if (!matchFound) {
            throw new Error(`Could not update item with id ${id} because it is not present`);
        }
    }

    /**
     * Update the friendly path of all the applicable items (inclduing descendents)
     * @param {string} originalPath Original path to be replaced
     * @param {string} updatedPath Updated path
     */
    public updateFriendlyPath(originalPath: string, updatedPath: string) {
        if (Utils_String.localeComparer(originalPath, updatedPath) !== 0) {

            // Find the updated node and its descendents
            var itemsToBeUpdated = this.getMatchingRecordWithDescendents(originalPath);

            for (var i = 0, len = itemsToBeUpdated.length; i < len; i++) {
                // We remove and add the item again to preserve the order
                var currentItem = itemsToBeUpdated[i];
                this.remove(currentItem.id);
                currentItem.friendlyPath = currentItem.friendlyPath.replace(originalPath, updatedPath);
                this.add(currentItem);
            }
        }
    }

    /**
     * Retrieves a classification from the data manager
     * @param id The id of the classification to find
     */
    public get(id: string): T {
        return this._idMap[id];
    }

    /**
     * Iterates through the items to find a matching node, with the specified friendly path
     * and also its descendents
     * @param {string} friendlyPath Friendly path of the node to be searched
     * @returns {ITeamClassificationRecord[]} A collection of the matching records
     */
    public getMatchingRecordWithDescendents(friendlyPath: string): T[] {
        var descendents: T[] = [];
        for (var i = 0, l = this.items.length; i < l; i++) {
            var currentItem = this.items[i];
            if (Utils_String.localeIgnoreCaseComparer(currentItem.friendlyPath, friendlyPath) === 0
                || TeamClassificationDataManager.isDescendantPath(currentItem.friendlyPath, friendlyPath)) {
                descendents.push(currentItem);
            }
        }
        return descendents;
    }

    private _checkForDuplicateId(id: string) {
        if (this._idMap[id]) {
            throw new Error(`Duplicate id detected: ${id}`);
        }
    }

    private _raiseDataChanged() {
        if ($.isFunction(this.changeHandler)) {
            this.changeHandler(this.items);
        }
    }
}


export class TeamAreaDataManager extends TeamClassificationDataManager<ITeamAreaRecord> {

    /**
     * constructor for team area data manager
     * @param items
     * @param changeHandler
     */
    public constructor(items: ITeamAreaRecord[], protected changeHandler: IFunctionPR<ITeamAreaRecord[], void>) {
        super(items, changeHandler);

        this.items.sort((a: ITeamAreaRecord, b: ITeamAreaRecord) => {
            return Utils_String.localeIgnoreCaseComparer(a.friendlyPath, b.friendlyPath);
        }); 
    }

    /**
     * remove the selected area on the grid. The method can be called from toolbar and context menu
     * @param nodeGuid the guid of select area
     * @return string: the new default area if it is changed otherwise null
     */
    public removeArea(nodeGuid: string): string {
        //This condition shouldn't be hit, but leave it here just in case
        Diag.Debug.assert(this.items.length > 1, "The last area cannot be removed");
        Diag.Debug.assertIsNotNull(nodeGuid, "Guid is null");

        if (nodeGuid) {
            var newDefaultPath: string = null;
            //if the default item is the first item in grid, then make the second area as the default one
            var isCurrentDefaultArea = this.get(nodeGuid).isDefault;
            if (isCurrentDefaultArea) {
                var index = 0;
                if (this.items[0].id === nodeGuid) {
                    index = 1;
                }
                this.items[index].isDefault = true;
                this.update(this.items[index]);
                newDefaultPath = this.items[index].friendlyPath;
            }

            this.remove(nodeGuid);
            return newDefaultPath;
        }
    }

    /**
     * update default area in the grid
     * @param nodeGuid the guid of selected area
     * @return string return old default path
     */
    public updateDefaultArea(newDefaultArea: ITeamAreaRecord): string {
        var isDefaultAreaInDataManager = false;
        var oldDefaultPath: string = null;

        for (var i = 0, l = this.items.length; i < l; i++) {
            var areaRecord = this.items[i];
            if (areaRecord.isDefault) {
                areaRecord.isDefault = false;
                this.update(areaRecord);

                oldDefaultPath = areaRecord.friendlyPath;
            }

            if (areaRecord.id === newDefaultArea.id) {
                areaRecord.isDefault = true;
                //Check if the nodeGuid exists in the grid
                isDefaultAreaInDataManager = true;
                this.update(areaRecord);
            }
        }

        if (!isDefaultAreaInDataManager) {
            this.add(newDefaultArea);
        }

        //return the old default area path to check if its parents has includeChildren. If so, remove the default area
        return oldDefaultPath;
    }

    /**
     * Set include sub area value for selected area
     * @param currentGuid the guid of selected area
     * @param childGuids guid list of selected area's children
     * @return ITeamAreaRecord[] return set of area records that have been removed as a result of the inclusion of sub areas
     */
    public includeSubAreas(currentGuid: string, childGuids: string[]): ITeamAreaRecord[] {
        var isIncluding = !this._idMap[currentGuid].includeChildren;
        var toBeRemoved: ITeamAreaRecord[] = [];

        for (var i = 0, l = this.items.length; i < l; i++) {
            var areaRecord = this.items[i];

            if (areaRecord.id === currentGuid) {
                areaRecord.includeChildren = isIncluding;
                this.update(areaRecord);
            }

            if (isIncluding) {
                if (currentGuid !== areaRecord.id && ($.inArray(areaRecord.id, childGuids) > -1) && !areaRecord.isDefault) {
                    toBeRemoved.push(areaRecord);
                }
            }
        }

        for (var i = 0, l = toBeRemoved.length; i < l; i++) {
            this.remove(toBeRemoved[i].id);
        }

        return toBeRemoved;
    }

    /**
    * OVERRIDE: Enforces alphabetical ordering while adding. 
    * NOTE: Would prefer to make sorting a behavior of the derivations instead of overriding the add but the precedent
    * was set in TeamIterationDataManager and it is too much churn before the end of S99.
    * @param areaRecord The classification record for the area to add
    */
    public add(areaRecord: ITeamAreaRecord) {
        var indexToInsert = 0;

        while (indexToInsert < this.items.length) {
            var record = this.items[indexToInsert];

            if (Utils_String.localeIgnoreCaseComparer(record.friendlyPath, areaRecord.friendlyPath) > 0) {
                break;
            }

            indexToInsert++;
        }

        this.addAtIndex(areaRecord, indexToInsert);
    }
}

export class TeamIterationDataManager extends TeamClassificationDataManager<ITeamIterationRecord>{
    private _backlogIterationRecord: ITeamIterationRecord;

    /**
     * Constructor
     * @param backlogIterationRecord The classification record for the backlog iteration
     * @param items The classification records to prime the data manager with
     * @param changeHandler The change handler to invoke when data changes
     */
    public constructor(backlogIterationRecord: ITeamIterationRecord, items: ITeamIterationRecord[], protected changeHandler: IFunctionPR<ITeamIterationRecord[], void>) {
        super(items, changeHandler);
        this._backlogIterationRecord = backlogIterationRecord;
    }

    /**
     * OVERRIDE: Adds the current iteration record after ensuring that it is not duplicate as well as it is a valid descendent of the backlog iteration.
     * Also identifies and removes the records, which became invalid due to insertion of the current item
     * Iterations added are inserted in sorted into the list of iterations by start date, and then by alphabetical order if start date is not set.
     * All iterations with a start date are considered of a higher sort order than those without
     * @param iterationRecord The classification record for the iteration to add
     * @returns The records, which became invalid due to insertion of the current item
     */
    public add(iterationRecord: ITeamIterationRecord): ITeamIterationRecord[] {
        var result = this.validateIterationPath(iterationRecord);
        var recordsToRemove: ITeamIterationRecord[] = [];
        if (result.valid) {
            recordsToRemove = this._processIterationPath(iterationRecord);
            var pivotIndex = this.items.length - 1;
            if (iterationRecord.startDate) { // if the added iteration has a start date, lets put it in the right order based off start date
                var iterationStartDate = Utils_Date.shiftToLocal(new Date(iterationRecord.startDate));
                while (pivotIndex >= 0) {
                    var areaRecord = this.items[pivotIndex];
                    if (areaRecord.startDate) {
                        if (Utils_Date.defaultComparer(Utils_Date.shiftToLocal(new Date(areaRecord.startDate)), iterationStartDate) < 0) {
                            break;
                        }
                    }

                    pivotIndex--;
                }
            }
            else { // otherwise, lets put it in the right order based off alphabetical order
                var areaRecord = this.items[pivotIndex];
                if (!areaRecord || !areaRecord.startDate) {
                    while (pivotIndex >= 0) {
                        var areaRecord = this.items[pivotIndex];
                        if (areaRecord.startDate || Utils_String.localeIgnoreCaseComparer(areaRecord.friendlyPath, iterationRecord.friendlyPath) < 0) {
                            break;
                        }
                        pivotIndex--;
                    }
                }
            }

            this.addAtIndex(iterationRecord, pivotIndex + 1);
            // Remove recordsToRemove
            for (var i = 0, len = recordsToRemove.length; i < len; i++) {
                this.remove(recordsToRemove[i].id);
            }
        }
        return recordsToRemove; // Return the records removed
    }

    /**
     * OVERRIDE: Update is a no-op.
     */
    public update(iterationRecord: ITeamIterationRecord) {
        return;
    }

    /**
     * Return backlog iteration record.
     */
    public getBacklogIteration(): ITeamIterationRecord {
        return this._backlogIterationRecord;
    }

    /**
     * Validates the current iteration record to ensure that it is not duplicate as well as it is a valid descendent of the backlog iteration
     * @param iterationRecord The classification record for the iteration to validate
     */
    public validateIterationPath(iterationRecord: ITeamIterationRecord): IClassificationValidationResult {
        var result = <IClassificationValidationResult>{
            valid: true,
            errorMessage: null
        };

        if (this.get(iterationRecord.id)) {
            result.valid = false;
            result.errorMessage = AgileResources.AdminWorkHub_Iteration_DuplicateErrorMessage;
        }
        else if (!TeamClassificationDataManager.isDescendantPath(iterationRecord.friendlyPath, this._backlogIterationRecord.friendlyPath)) {
            result.valid = false;
            result.errorMessage = AgileResources.AdminWorkHub_InvalidBacklogIterationMessage;
        }

        return result;
    }


    /**
     * Updates the backlog revision and removes the records, which became invalid due to updating the backlog iteration
     * @param backlogIterationRecord The classification record for the backlog iteration to be validated
     * @returns The records, which became invalid due to updating the backlog iteration
     */
    public updateBacklogIteration(backlogIterationRecord: ITeamIterationRecord): ITeamIterationRecord[] {
        var recordsToRemove = this._processBacklogIteration(backlogIterationRecord);
        this._backlogIterationRecord = backlogIterationRecord;
        for (var i = 0, len = recordsToRemove.length; i < len; i++) {
            this.remove(recordsToRemove[i].id);
        }
        return recordsToRemove;
    }

    /**
     * Update the friendly path all the applicable items (inclduing descendents) and the start and end dates of the specified record
     * @param {ITeamIterationRecord} originalRecord Original path to be replaced
     * @param {ITeamIterationRecord} updatedRecord Updated path
     */
    public updateIteration(originalRecord: ITeamIterationRecord, updatedRecord: ITeamIterationRecord) {

        // Find the updated node and its descendents
        var itemsToBeUpdated = <ITeamIterationRecord[]>this.getMatchingRecordWithDescendents(originalRecord.friendlyPath);

        // Remove and add the updated items to ensure that they get added to the right index
        for (var i = 0, len = itemsToBeUpdated.length; i < len; i++) {
            // We remove and add the item again to preserve the order
            var currentItem = itemsToBeUpdated[i];
            this.remove(currentItem.id);
            // Update the friendly path
            currentItem.friendlyPath = currentItem.friendlyPath.replace(originalRecord.friendlyPath, updatedRecord.friendlyPath);
            if (currentItem.id === originalRecord.id) {
                // Also update the start and end dates for the edited node
                currentItem.startDate = updatedRecord.startDate;
                currentItem.endDate = updatedRecord.endDate;
            }
            this.add(currentItem);
        }
    }

    /**
     * Identifies and returns the records to be removed if this iteration record were to be included
     * Does not update the state of the data manager in any sense.
     * @param iterationRecord The classification record for the iteration to process
     * @returns The records to be removed if this iteration record were to be included
     */
    private _processIterationPath(iterationRecord: ITeamIterationRecord): ITeamIterationRecord[] {
        var recordsToRemove: ITeamIterationRecord[] = [];
        for (var i = 0, l = this.items.length; i < l; i++) {
            var currentRecord = this.items[i];
            if (TeamClassificationDataManager.isDescendantPath(currentRecord.friendlyPath, iterationRecord.friendlyPath)
                || TeamClassificationDataManager.isDescendantPath(iterationRecord.friendlyPath, currentRecord.friendlyPath)) {
                recordsToRemove.push(currentRecord);
            }
        }
        return recordsToRemove;
    }

    /**
     * Identifies and returns the records to be removed if this iteration record were to be set as the backlog iteration
     * Does not update the state of the data manager in any sense.
     * @param backlogIterationRecord The classification record for the backlog iteration to be validated
     * @returns The records to be removed if this iteration record were to be set as backlog iteration
     */
    private _processBacklogIteration(backlogIterationRecord: ITeamIterationRecord): ITeamIterationRecord[] {
        var recordsToRemove: ITeamIterationRecord[] = [];
        for (var i = 0, l = this.items.length; i < l; i++) {
            var currentRecord = this.items[i];
            // items not falling under the new backlog iteration should be removed
            if (!TeamClassificationDataManager.isDescendantPath(currentRecord.friendlyPath, backlogIterationRecord.friendlyPath)) {
                recordsToRemove.push(currentRecord);
            }
        }
        return recordsToRemove;
    }
}

/** Classification specifier for team settings controls */
export enum ClassificationControlNodeType {
    Iteration = 0,
    Area = 1
}
