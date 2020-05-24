import * as WITConstants from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import * as WorkItemTracking_Constants from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import * as TFS_Host_TfsContext from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import * as TestsOM from "TestManagement/Scripts/TFS.TestManagement";
import * as TMUtils from "TestManagement/Scripts/TFS.TestManagement.Utils";
import * as WitContracts from "TFS/WorkItemTracking/Contracts";
import * as WorkItemContracts from "TFS/WorkItemTracking/Contracts";

export enum workItemCategoryType {
    Bug = 0,
    Requirement = 1,
}

export class QueryWorkItemHelper {

    /**
    * Queries all the bugs for given query string. If queryPattern is empty/null, it will show suggestion.
    * @param queryPattern: Part of the title or ID.
    * @param projectName: Will search for the workitems inside the given project name as area path.
    * @param categoryType: Bug or Requirement
    * @param onSuccess: If the data is successfully retreived then onSucess method is called with the response
    */
    public static getWorkItemsByIdAndTitle(queryPattern: string, projectName: string, categoryType: workItemCategoryType, onSuccess: (response: any) => void, onFailure?: (error?: any) => void): void {

        if (categoryType === workItemCategoryType.Bug) {
            this.defaultBugWorkItemType = Resources.BugCategoryRefName;

            TMUtils.WorkItemUtils.getDefaultWorkItemTypeNameForCategory(TestsOM.WorkItemCategories.Bug, (bugCategoryTypeName) => {
                this.defaultBugWorkItemType = bugCategoryTypeName || this.defaultBugWorkItemType;
                this.getWorkItems(queryPattern, projectName, categoryType, onSuccess, onFailure);
            });
        }
        else {
            this.getWorkItems(queryPattern, projectName, categoryType, onSuccess, onFailure);
        }
    }

    public static getWorkItems(queryPattern: string, projectName: string, categoryType: workItemCategoryType, onSuccess: (response: any) => void, onFailure?: (error?: any) => void): void {

        if (projectName) {
            let columns = this.getColumnsForWit();

            this.queryWorkItemsAndCallSuccessCallback(queryPattern, projectName, categoryType, (witIds: number[]) => {
                let containsId = this.addWorkItemPresentInSearchQuery(witIds, queryPattern);
                this.getWorkItemsByIds(columns, witIds, containsId, categoryType, onSuccess, onFailure);
            }, (error) => {
                onFailure(error);
            });
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

    private static getWorkItemsByIds(columns: string[], witIds: number[], filterWorkItemsRequired: boolean, categoryType: workItemCategoryType,
        onSuccess: (response: any) => void, onFailure: (error: any) => void): void {
        if (columns.length > 0 && witIds.length > 0) {
            TMUtils.getWorkItemTrackingManager().getWorkItems(witIds, columns).then((response: WorkItemContracts.WorkItem[]) => {
                this.getFilterResults(response, filterWorkItemsRequired, categoryType, onSuccess, onFailure);
            }, (error) => {
                onFailure(error);
            });
        } else {
            onSuccess(null);
        }
    }

    public static getFilterResults(response: any[], filterRequired: boolean, categoryType: workItemCategoryType, onSuccess: (response: any) => void, onFailure: (error: any) => void): void {
        if (filterRequired && response) {
            let workItemCategoryName: string = TestsOM.WorkItemCategories.Requirement;
            if (categoryType === workItemCategoryType.Bug) {
                workItemCategoryName = TestsOM.WorkItemCategories.Bug;
            }

            TMUtils.WorkItemUtils.beginGetWorkItemCategory(workItemCategoryName, (workItemCategory: WorkItemContracts.WorkItemTypeCategory) => {
                response = response.filter(workItem => {
                    let resultMatch = false;
                    workItemCategory.workItemTypes.forEach(type => {
                        if (type.name === workItem.fields[WITConstants.CoreFieldRefNames.WorkItemType]) {
                            resultMatch = true;
                        }
                    });

                    return resultMatch;
                });

                onSuccess(response);
            });
        }
        else {
            onSuccess(response);
        }
    }

    private static queryWorkItemsAndCallSuccessCallback(queryPattern: string, projectName: string, categoryType: workItemCategoryType, onSuccess?: (witIds: number[]) => void, onFailure?: (error?: any) => void): void {

        let promise = this.queryWorkItemsByWiqlQuery(queryPattern, projectName, categoryType);
        promise.then((response) => {
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
    }

    // This function is public for testing perpose.
    public static queryWorkItemsByWiqlQuery(queryPattern: string, projectName: string, categoryType: workItemCategoryType): Q.IPromise<any> {
        let wiqlQuery: any;

        if (queryPattern) {
            if (categoryType === workItemCategoryType.Requirement) {
                this.topResultsCount = 50;
                wiqlQuery = this.createWiqlQueryForRequirementUsingTitle(queryPattern, projectName);
            }
            else {
                this.topResultsCount = 25;
                wiqlQuery = this.createWiqlQueryForBugsUsingTitle(queryPattern, projectName);
            }
        }
        else {
            if (categoryType === workItemCategoryType.Requirement) {
                this.topResultsCount = 50;
                wiqlQuery = this.createWiqlQueryForRequirementSuggestion(projectName);
            }
            else {
                this.topResultsCount = 25;
                wiqlQuery = this.createWiqlQueryForBugSuggestion(projectName);
            }
        }

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

    private static createWiqlQueryForRequirementUsingTitle(queryPattern: string, projectName: string): WitContracts.Wiql {
        let searchCondition: string = this.createSearchConditionForTitle(queryPattern);
        if (searchCondition === "") {
            return null;
        }

        let queryString: string = "SELECT [" + WorkItemTracking_Constants.CoreFieldRefNames.Id + "] FROM WorkItems WHERE " +
            " ([" + WorkItemTracking_Constants.CoreFieldRefNames.WorkItemType + "] In Group " + "\'" + "Microsoft.RequirementCategory" + "\'" +
            " AND (" + searchCondition + ")" +
            " AND [" + WorkItemTracking_Constants.CoreFieldRefNames.AreaPath + "] under" + "\'" + projectName + "\'" + ")" +
            " ORDER BY [" + WorkItemTracking_Constants.CoreFieldRefNames.CreatedDate + "] DESC ";

        let wiql: WitContracts.Wiql = { query: queryString };
        return wiql;
    }

    private static createWiqlQueryForRequirementSuggestion(projectName: string): WitContracts.Wiql {
        let queryString: string = "SELECT [" + WorkItemTracking_Constants.CoreFieldRefNames.Id + "] FROM WorkItems WHERE " +
            " ([" + WorkItemTracking_Constants.CoreFieldRefNames.WorkItemType + "] In Group " + "\'" + "Microsoft.RequirementCategory" + "\'" +
            " AND [" + WorkItemTracking_Constants.CoreFieldRefNames.ChangedDate + "] >= @today - 30" +
            " AND [" + WorkItemTracking_Constants.CoreFieldRefNames.State + "] NOT IN ('Completed','Cut','Closed','Done' " + ")" +
            " AND [" + WorkItemTracking_Constants.CoreFieldRefNames.AreaPath + "] under" + "\'" + projectName + "\'" + ")" +
            " ORDER BY [" + WorkItemTracking_Constants.CoreFieldRefNames.CreatedDate + "] DESC ";

        let wiql: WitContracts.Wiql = { query: queryString };
        return wiql;
    }

    private static createWiqlQueryForBugSuggestion(projectName: string): WitContracts.Wiql {

        let queryString: string = "SELECT [" + WorkItemTracking_Constants.CoreFieldRefNames.Id + "] FROM WorkItems WHERE " +
            " ([" + WorkItemTracking_Constants.CoreFieldRefNames.WorkItemType + "] = " + "\'" + this.defaultBugWorkItemType + "\'" +
            " AND [" + WorkItemTracking_Constants.CoreFieldRefNames.AreaPath + "] under" + "\'" + projectName + "\'" + ")" +
            " ORDER BY [" + WorkItemTracking_Constants.CoreFieldRefNames.ChangedDate + "] DESC ";

        let wiql: WitContracts.Wiql = { query: queryString };
        return wiql;
    }

    private static createWiqlQueryForBugsUsingTitle(queryPattern: string, projectName: string): WitContracts.Wiql {
        let searchCondition: string = this.createSearchConditionForTitle(queryPattern);
        if (searchCondition === "") {
            return null;
        }

        let queryString: string = "SELECT [" + WorkItemTracking_Constants.CoreFieldRefNames.Id + "] FROM WorkItems WHERE " +
            " ([" + WorkItemTracking_Constants.CoreFieldRefNames.WorkItemType + "] = " + "\'" + this.defaultBugWorkItemType + "\'" +
            " AND (" + searchCondition + ")" +
            " AND [" + WorkItemTracking_Constants.CoreFieldRefNames.AreaPath + "] under" + "\'" + projectName + "\'" + ")" +
            " ORDER BY [" + WorkItemTracking_Constants.CoreFieldRefNames.ChangedDate + "] DESC ";

        let wiql: WitContracts.Wiql = { query: queryString };
        return wiql;
    }

    private static createSearchConditionForTitle(queryPattern: string): string {
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

    private static defaultBugWorkItemType: string;
    private static topResultsCount: number;
}