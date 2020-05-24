import TFS_Admin_Security = require("Admin/Scripts/TFS.Admin.Security");
import TFS_Admin_Common = require("Admin/Scripts/TFS.Admin.Common");
import TFS_Admin_Dialogs = require("Admin/Scripts/TFS.Admin.Dialogs");
import Dialogs = require("VSS/Controls/Dialogs");
import adminResources = require("Admin/Scripts/Resources/TFS.Resources.Admin");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Diag = require("VSS/Diag");
import Controls = require("VSS/Controls");
import Panels = require("VSS/Controls/Panels");
import Utils_String = require("VSS/Utils/String");
import AdminProcessCommon = require("Admin/Scripts/TFS.Admin.Process.Common");

var tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();

export class ProcessSecurityView extends Panels.AjaxPanel {

    private _ajaxPanel: Panels.AjaxPanel;
    private _process: AdminProcessCommon.ProcessDescriptorViewModel;
    
    public static PROCESS_SECURITY_SET: string = "2DAB47F9-BD70-49ED-9BD5-8EB051E59C02"

    constructor(options: AdminProcessCommon.ProcessControlOptions.Process) {
        super(options);
        this._process = options.process;
    }

    public initialize() {
        super.initialize();
        this._initialize();
    }

    private _initialize() {
        var token: string,
            title: string,
            permissionSet: any;

        token = '$PROCESS:';
        if (this._process.isInherited) {
            token = token + this._process.inherits + ':' + this._process.processTypeId + ':';
        }
        else {
            token = token + this._process.processTypeId + ':';
        }

        title = Utils_String.format(adminResources.ProcessSecurityTitle, this._process.name);
        permissionSet = ProcessSecurityView.PROCESS_SECURITY_SET;

        if (this._ajaxPanel) {
            this._ajaxPanel.dispose();
            this._ajaxPanel = null;
        }

        this._ajaxPanel = <Panels.AjaxPanel>Controls.BaseControl.createIn(Panels.AjaxPanel, this._element, <Panels.IAjaxPanelOptions>{
            tfsContext: tfsContext,
            url: tfsContext.getActionUrl("index", "security", { area: "admin" }),
            urlParams: {
                permissionSet: permissionSet,
                token: token,
                tokenDisplayVal: title,
                style: "min"
            }
        });
    }

    public refresh(processDescriptor: AdminProcessCommon.ProcessDescriptorViewModel) {
        this._process = processDescriptor;
        this._initialize();
    }

    private _showProcessSecurityDialog(contextInfo) {

        var token: string = '$PROCESS:';
        if (contextInfo.item.Inherits === Utils_String.EmptyGuidString) {
            token = token + contextInfo.item.TemplateTypeId + ':';
        }
        else { // this is an inherited process
            token = token + contextInfo.item.Inherits + ':' + contextInfo.item.TemplateTypeId + ':';
        }

        Dialogs.show(TFS_Admin_Security.SecurityDialog, {
            permissionSet: ProcessSecurityView.PROCESS_SECURITY_SET,
            token: token,
            tokenDisplayVal: contextInfo.item.Name
        });
    }
}
