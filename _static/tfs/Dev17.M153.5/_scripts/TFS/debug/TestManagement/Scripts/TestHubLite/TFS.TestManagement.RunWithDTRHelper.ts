import * as TestsOM from "TestManagement/Scripts/TFS.TestManagement";

import * as RunWithDTRDialog from "TestManagement/Scripts/Scenarios/RunWithDTRDialog/Components/RunWithDTRDialog";
import { getCookie } from "Presentation/Scripts/TFS/TFS.Core.Utils";
import TCMLite = require("TestManagement/Scripts/TFS.TestManagement.Lite");

export class RunWithDTRDialogOptions {
    requirementId: number;
    showXTRunner: boolean;
    dtrCallBack: () => void;
}

export class RunWithDTRHelper {

    public runWithDTR(options: RunWithDTRDialogOptions){
        let skipDTRDialog: string = getCookie(TCMLite.Constants.HideDTRLaunchDialogCookieName);
        
        if(skipDTRDialog === "true"){
            options.dtrCallBack();
        }
        else{
            this._openRunWithDTRDialog(options);
        }
    }

    private _openRunWithDTRDialog(options: RunWithDTRDialogOptions) {
        let container = document.createElement("div");
        // Render Dialog
        let props: RunWithDTRDialog.IRunWithDTRDialogProps = {
            dtrCallBack: options.dtrCallBack
        };
        RunWithDTRDialog.renderDialog(container, props);
    }
}