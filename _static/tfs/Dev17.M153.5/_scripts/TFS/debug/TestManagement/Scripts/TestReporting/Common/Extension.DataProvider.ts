
import q = require("q");

import * as CommonBase from "TestManagement/Scripts/TestReporting/Common/Common";
import * as Common from "TestManagement/Scripts/TestReporting/Common/Common";
import * as DataProviderCommon from "TestManagement/Scripts/TestReporting/DataProviders/Common";
import * as ViewSettings from "TestManagement/Scripts/TestReporting/Common/View.Settings";

import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import TFS_WebSettingsService = require("Presentation/Scripts/TFS/TFS.WebSettingsService");


import { format as StringFormat, equals as StringEquals } from "VSS/Utils/String";
import * as VSS from "VSS/VSS";
import * as Diag from "VSS/Diag";

import TCMPermissionUtils = require("TestManagement/Scripts/Utils/TFS.TestManagement.PermissionUtils");

let TfsContext = TFS_Host_TfsContext.TfsContext;

/// <summary>
/// Factory class to create data provider instance
/// </summary>
export class DataProvider {

    public static IsInitialized(viewContext: CommonBase.ViewContext): boolean {
        return (this._dataProviders[viewContext] !== undefined && this._dataProviders[viewContext] !== null);
    }

    /// <summary>
    /// Initialize the DataProvider only in the initial script of contribution.
    /// Donot initialize in the common code.
    /// </summary>
    public static initializeDataProvider(viewContext: CommonBase.ViewContext, dataProvider: DataProviderCommon.IDataProvider): void {
        if (!this._dataProviders[viewContext]) {
            this._dataProviders[viewContext] = dataProvider;
        } else {
            Diag.logInfo("DataProvider already initialized.");
        }
    }

    /// <summary>
    /// Used to fetch a data provider based on communicator type
    /// </summary>
    /// <param name='communicatorType'>communicator type</param>
    /// <return>promise for data provider object</return>
    public static getDataProvider(viewContext: CommonBase.ViewContext): IPromise<DataProviderCommon.IDataProvider> {
        let deferred: Q.Deferred<DataProviderCommon.IDataProvider> = q.defer<DataProviderCommon.IDataProvider>();

        if (this._dataProviders[viewContext]) {
            deferred.resolve(this._dataProviders[viewContext]);
        } else {
            switch (viewContext) {
                case CommonBase.ViewContext.Build:
                    VSS.using(["TestManagement/Scripts/TestReporting/DataProviders/Build.DataProvider"], (module) => {
                        this._dataProviders[viewContext] = new module.BuildDataProvider();
                        deferred.resolve(this._dataProviders[viewContext]);
                    });
                    break;
                case CommonBase.ViewContext.Release:
                    VSS.using(["TestManagement/Scripts/TestReporting/DataProviders/Release.DataProvider"], (module) => {
                        this._dataProviders[viewContext] = new module.ReleaseDataProvider();
                        deferred.resolve(this._dataProviders[viewContext]);
                    });
                    break;
                case CommonBase.ViewContext.WorkItem:
                    VSS.using(["TestManagement/Scripts/TestReporting/DataProviders/WorkItem.DataProvider"], (module) => {
                        this._dataProviders[viewContext] = new module.WorkItemDataProvider();
                        deferred.resolve(this._dataProviders[viewContext]);
                    });
                    break;
                default:
                    throw (StringFormat("[DataProvider.getDataProvider]: Unsupported viewContext type: {0}", viewContext));
            }
        }

        return deferred.promise;
    }

    /// <summary>
    /// gets the test query parameter based on pivot, filter for the data passed
    /// </summary>
    public static getTestQueryParameter(viewContext: CommonBase.ViewContext, data: Common.IData, pivot?: string, filter?: string, sortBy?: string, includeResults: boolean = true, isInProgress: boolean = false): DataProviderCommon.ITestsQueryParameters {
        let sourceWorkflow: string = DataProviderCommon.SourceWorkflow.BUILD_SOURCE_WORKFLOW;

        switch (viewContext) {
            case CommonBase.ViewContext.Build:
                sourceWorkflow = DataProviderCommon.SourceWorkflow.BUILD_SOURCE_WORKFLOW;
                break;
            case CommonBase.ViewContext.Release:
                sourceWorkflow = DataProviderCommon.SourceWorkflow.RELEASE_SOURCE_WORKFLOW;
                break;
        }

        let parameter: DataProviderCommon.ITestsQueryParameters = {
            viewContextData: data,
            sourceWorkflow: sourceWorkflow,
            groupBy: (pivot) ? pivot : null,
            filter: (filter) ? filter : null,
            sortBy: (sortBy) ? sortBy : null,
            includeResults: includeResults,
            isInProgress: isInProgress,
        };

        return parameter;
    }

    // #region Private static method section                      
    private static _dataProviders: DataProviderCommon.IDataProvider[] = [];
}

export class UserSettingsDataProvider {

    public static getDefaultUserSettings(view: CommonBase.ViewContext): IPromise<string> {
        this.saveDefaultviewSettingsInstanceAtPageLoad();
        let deferred: Q.Deferred<string> = q.defer<string>();
        if (!this._webSettingsService) {
            this._webSettingsService = TFS_OM_Common.Application.getConnection(TfsContext.getDefault()).getService<TFS_WebSettingsService.WebSettingsService>(TFS_WebSettingsService.WebSettingsService);
        }
        let registryPath, viewSettingsInstance;
        switch (view) {
            case CommonBase.ViewContext.Build:
                registryPath = "/TestsTabInBuildUserSettings";
                viewSettingsInstance = ViewSettings.TestReportViewSettings.getInstance();
                break;
            case CommonBase.ViewContext.Release:
                registryPath = "/TestTabInReleaseUserSettings";
                viewSettingsInstance = ViewSettings.TestReportViewSettings.getInstance();
                break;
            default:
                Diag.logWarning("User settings not applicable");
                break;
        }

		if (!TCMPermissionUtils.PermissionUtils.hasTestManagementUserSettingsPermission(TFS_Host_TfsContext.TfsContext.getDefault().navigation.projectId)) {
			deferred.reject(null);
		}

		else {
			this._webSettingsService.beginReadSetting(registryPath, TFS_WebSettingsService.WebSettingsScope.User,
				(option: any) => {
					let userSettings = ViewSettings.TestReportViewSettings.getInstance().getViewSettings();
					if (option.value) {
						try {
							userSettings = JSON.parse(option.value);
							viewSettingsInstance.updateSettings(userSettings);
						} catch (e) {
							Diag.logWarning(e);
							deferred.reject(e);
						}
					}
					deferred.resolve("User settings successfully read from the server");
				}, (error) => {
					deferred.reject(error.toString());
				});
		}
        return deferred.promise;
    }

    private static saveDefaultviewSettingsInstanceAtPageLoad() {
        let userSelectedColumns = ViewSettings.TestReportViewSettings.getInstance().getViewSettings().selectedColumns;
        userSelectedColumns.forEach((selectedColumn) => {
            this.columns.push(selectedColumn.columnName);
        });
    }

    public static columns: string[] = [];
    private static _webSettingsService: TFS_WebSettingsService.WebSettingsService;
}

export class TIAEnabledDefinitionsDataProvider {

    public static isTIANotificationDismissed(currentDefinitionId): IPromise<boolean> {
        let deferred: Q.Deferred<boolean> = q.defer<boolean>();
        if (!this._webSettingsService) {
            this._webSettingsService = TFS_OM_Common.Application.getConnection(TfsContext.getDefault()).getService<TFS_WebSettingsService.WebSettingsService>(TFS_WebSettingsService.WebSettingsService);
        }


		if (!TCMPermissionUtils.PermissionUtils.hasTestManagementUserSettingsPermission(TFS_Host_TfsContext.TfsContext.getDefault().navigation.projectId)) {
			deferred.resolve(false);
		}

		else {
			this.readDefinitionId().then(defnIds => {
				if (defnIds !== null) {
					let defnId: string[] = defnIds.split(",");
					deferred.resolve(defnId.indexOf(currentDefinitionId.toString()) >= 0);
				}
				else {
					deferred.resolve(false);
				}
			},
				(error) => {
					deferred.resolve(false);
				});
		}
        return deferred.promise;
    }  

    public static dismissEnableTIANotification(currentDefinitionId) {
        if (!this._webSettingsService) {
            this._webSettingsService = TFS_OM_Common.Application.getConnection(TfsContext.getDefault()).getService<TFS_WebSettingsService.WebSettingsService>(TFS_WebSettingsService.WebSettingsService);
        }
        let currentId = "";

        this.readDefinitionId().then(defnIds => {
            if (defnIds !== null) {
                currentId = defnIds;
            }
                currentId = currentId + "," + currentDefinitionId;
                this._webSettingsService.beginWriteSetting("/TFSEnableTIAMessagaSettings", currentId, TFS_WebSettingsService.WebSettingsScope.User);
                   
        },
            (error) => {
                currentId = currentId + "," + currentDefinitionId;
                this._webSettingsService.beginWriteSetting("/TFSEnableTIAMessagaSettings", currentId, TFS_WebSettingsService.WebSettingsScope.User);
            });               
    }     

    public static readDefinitionId(): IPromise<string> {
        let deferred: Q.Deferred<string> = q.defer<string>();
        this._webSettingsService.beginReadSetting("/TFSEnableTIAMessagaSettings", TFS_WebSettingsService.WebSettingsScope.User,
            (option: any) => {
                if (option.value) {
                    let defnIds: string = option.value;                    
                    deferred.resolve(defnIds);
                }
                else {
                    deferred.resolve(null);
                }
            }, (error) => {
                deferred.resolve(null);
            });

        return deferred.promise;
    }

    private static _webSettingsService: TFS_WebSettingsService.WebSettingsService;
}
