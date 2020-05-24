



import Common = require("TestManagement/Scripts/TestReporting/TestTabExtension/Common");

import VSS = require("VSS/VSS");

export interface IResultsViewModel {
    load(viewContextdata: Common.IViewContextData): void;
    handleOnDisplayed(): void;
}

/// View model factory
export class ResultsViewModel {

    // #region Public static method section                      
    public load(viewContextdata: Common.IViewContextData): void {
            for (let i = 0, len = this._viewModelList.length; i < len; i++) {
                this._viewModelList[i].load(viewContextdata);
            }
    }

    public handleOnDisplayed(): void {
        for (let i = 0, len = this._viewModelList.length; i < len; i++) {
            this._viewModelList[i].handleOnDisplayed();
        }
    }

    public add(viewModel: IResultsViewModel) {
        if (viewModel) {
            this._viewModelList.push(viewModel);
        }
    }

    // #region Private variables section
    private _viewModelList: IResultsViewModel[] = [];                      
}

// TFS plug-in model requires this call for each TFS module.
VSS.tfsModuleLoaded("TFS.TestManagement.TestResults.ResultsViewModel", exports);
