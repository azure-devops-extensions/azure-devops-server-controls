import VSS = require("VSS/VSS");
import Controls = require("VSS/Controls");
import Splitter = require("VSS/Controls/Splitter");
import SPS_Host_TfsContext = require("Presentation/Scripts/TFS/SPS.Host.TfsContext");
import ExtGrid = require("UserManagement/Scripts/Models/ExtensionGrid");

export class ExtensionControl
    extends Controls.BaseControl {
    public static enhancementTypeName = "tfs.account.ExtensionControl";
    private $extensionGrid: ExtGrid.ExtensionGrid;
    private $extensionCol: any;
    private _splitter: Splitter.Splitter;
    private _test1: any;

    constructor(options?) {
        super(options);
    }
    public initialize() {
        var $element: JQuery = this.getElement();
        ExtensionControl
        super.initialize();
        this.$extensionCol = this._element.find('#extensionCol');
        this.initializeGuid();

        this._splitter = <Splitter.Splitter>Controls.BaseControl.createIn(Splitter.Splitter, $element, { showInput: this._options.showInput, members: this._options.Members });
    }

    private initializeGuid() {
        var container = $("<div class='extension-view' />").appendTo(this.$extensionCol);
        this.$extensionGrid = <ExtGrid.ExtensionGrid>Controls.Enhancement.enhance(ExtGrid.ExtensionGrid, container);
    }
}

VSS.classExtend(ExtensionControl, SPS_Host_TfsContext.TfsContext.ControlExtensions);