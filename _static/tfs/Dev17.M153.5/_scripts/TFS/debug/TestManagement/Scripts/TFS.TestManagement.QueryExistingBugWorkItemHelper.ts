import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import WITConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");

import WitContracts = require("TFS/WorkItemTracking/Contracts");
import TMUtils = require("TestManagement/Scripts/TFS.TestManagement.Utils");
import Resources = require("TestManagement/Scripts/Resources/TFS.Resources.TestManagement");
import WorkItemContracts = require("TFS/WorkItemTracking/Contracts");

export class QueryExistingBugWorkItemHelper {

    /**
     * Queries all the bugs for given query string.
     * @param queryPattern: Part of the title or ID
     * @param areaPath: Will search for the bus inside the given area path
     * @param onSuccess: If the data is successfully retreived then onSucess method is called with the response
     */
    public static getWorkItemsByTitle(queryPattern: string, areaPath: string, bugCategoryType: string, onSuccess: (response: any) => void, onFailure?: (error?: any) => void): void {
        let bugType = "'" + bugCategoryType + "'";
        let workItemCategories = [bugType];
        if (queryPattern && workItemCategories) {
            if (areaPath) {
                let columns = this.getColumnsForWit();

                this.queryWorkItemsAndCallSuccessCallback(queryPattern, bugType, areaPath, (witIds: number[]) => {
                    let containsId = this.addWorkItemPresentInSearchQuery(witIds, queryPattern);
                    this.getWorkItemsByIds(columns, witIds, containsId, bugCategoryType, onSuccess, onFailure);
                }, (error) => {
                    onFailure(error);
                });
            } else {
                onFailure();
            }
        }
    }

    private static addWorkItemPresentInSearchQuery(witIds: number[], queryPattern: string): boolean {
        let containsId = this.checkQueryPatternIsId(queryPattern);
        if (containsId) {
            let id: number = parseInt(queryPattern.trim());
            if (witIds) {
                witIds.push(id);
            } else {
                witIds = [id];
            }
        }

        return containsId;
    }

    private static getColumnsForWit() {
        let columns: string[] = [];
        columns.push(WITConstants.CoreFieldRefNames.Title);
        columns.push(WITConstants.CoreFieldRefNames.AssignedTo);
        columns.push(WITConstants.CoreFieldRefNames.State);
        columns.push(WITConstants.CoreFieldRefNames.WorkItemType);

        return columns;
    }

    private static getWorkItemsByIds(columns: string[], witIds: number[], filterBugsRequired: boolean, bugCategoryType: string,
        onSuccess: (response: any) => void, onFailure: (error: any) => void): void {
        if (columns.length > 0 && witIds.length > 0) {
            TMUtils.getWorkItemTrackingManager().getWorkItems(witIds, columns).then((response: WorkItemContracts.WorkItem[]) => {
                if (filterBugsRequired && response) {
                    response = response.filter(workItem => workItem.fields[WITConstants.CoreFieldRefNames.WorkItemType] === bugCategoryType);
                }
                
                onSuccess(response);
            }, (error) => {
                onFailure(error);
            });
        } else {
            onSuccess(null);
        }
    }

    private static queryWorkItemsAndCallSuccessCallback(queryPattern: string, bugWorkItemType: string, areaPath: string, onSuccess?: (witIds: number[]) => void, onFailure?: (error?: any) => void): void {

        if (queryPattern) {
            let promise = this.queryWorkItemsByTitle(queryPattern, bugWorkItemType, areaPath);
            promise
                .then((response) => {
                    let ids: number[] = [];
                    for (let i: number = 0; i < response.workItems.length; i++) {
                        ids.push(response.workItems[i].id);
                    }
                    if (onSuccess) {
                        onSuccess(ids);
                    }
                },
                (error) => {
                    if (onFailure) {
                        onFailure(error);
                    }
                });
        } else {
            if (onFailure) {
                onFailure();
            }
        }
    }

    private static queryWorkItemsByTitle(queryPattern: string, bugWorkItemType: string, areaPath: string): Q.IPromise<any> {
        let wiqlQuery = QueryExistingBugWorkItemHelper.createWiqlQueryForTitle(queryPattern, bugWorkItemType, areaPath);

        if (wiqlQuery === null) {
            let d: Q.Deferred<any> = Q.defer<any>();
            d.reject({ message: Resources.QueryWorkItemsEmptyResponse });
            return d.promise;
        }
        else {
            let _tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
            return TMUtils.getWorkItemTrackingManager().getWorkItemsByWiqlQuery(wiqlQuery, _tfsContext.navigation.project, this.topResultsCount);
        }
    }

    private static createWiqlQueryForTitle(queryPattern: string, bugWorkItemType: string, areaPath: string): WitContracts.Wiql {
        let searchCondition: string = this.createSeacrhConditionForTitle(queryPattern);
        if (searchCondition === "") {
            return null;
        }
        let witCategoryCondition = " [System.WorkItemType] = " + bugWorkItemType;

        let currentDate = new Date();
        currentDate.setDate(currentDate.getDate() - this.workItemSeacrchLimitInNumberOfDays);
        let queryString: string = "Select [System.Id] From WorkItems Where " +
            "[System.AreaPath] = '" + areaPath +
            "' and (" + witCategoryCondition + " )" +
            " and (" + searchCondition + ")" +
            " order by [System.ChangedDate] desc ";

        let wiql: WitContracts.Wiql = { query: queryString };
        return wiql;
    }

    private static createSeacrhConditionForTitle(queryPattern: string): string {
        let titleWords = queryPattern.split(" ");
        let searchCondition: string = "";

        titleWords.forEach((word, index) => {
            if (word.indexOf("'") === -1) {
                searchCondition += "[System.Title] contains " + "\'" + word.replace("\"", "\\\"") + "\'";
            } else {
                if (word.indexOf("\"") !== -1) {
                    word = word.replace(/"/g, "&quot;");
                }
                searchCondition += "[System.Title] contains " + "\"" + word + "\"";
            }

            if (index !== titleWords.length - 1) {
                searchCondition += " or ";
            }
        });

        return searchCondition;
    }

    private static checkQueryPatternIsId(pattern: string): boolean {
        return pattern.trim().match(/^[0-9]+$/) !== null;
    }

    private static topResultsCount = 25;
    private static workItemSeacrchLimitInNumberOfDays = 180;
}
