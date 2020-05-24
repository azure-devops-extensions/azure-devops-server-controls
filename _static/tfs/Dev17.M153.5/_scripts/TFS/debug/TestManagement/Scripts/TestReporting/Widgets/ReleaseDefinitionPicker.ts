
import Combos = require("VSS/Controls/Combos");
import Utils_UI = require("VSS/Utils/UI");
import Resources = require("TestManagement/Scripts/Resources/Tfs.Resources.TestManagement");
import RMContracts = require("ReleaseManagement/Core/Contracts");
import RMService = require("TestManagement/Scripts/Services/TFS.ReleaseManagement.Service");
import Services = require("TestManagement/Scripts/Services/Services.Common");

import Controls = require("VSS/Controls");
import Diag = require("VSS/Diag");

export interface IReleaseDefinitionPickerOptions {
    initialValue?: RMContracts.ReleaseDefinition;
    onIndexChanged: (newValue: RMContracts.ReleaseDefinition) => void;
}

export class ReleaseDefinitionPicker extends Controls.Control<IReleaseDefinitionPickerOptions> {

    public initialize() {
        super.initialize();
        this._currentDefinition = this._options.initialValue;
        this._load();
    }

    private _load(): void {

        // create the combo control. This doesnt have the definition data populated yet. 
        this._releaseDefinitionCombo = this._createReleaseDefinitionCombo();

        // show placeholder loading text till data is available for the release dropdown.
        Utils_UI.Watermark(this._releaseDefinitionCombo.getInput(), { watermarkText: Resources.LoadingMessage });

        this.getElement().append(this._releaseDefinitionCombo.getElement());

        this._createProviderRootNodes();

        this._releaseDefinitionCombo.setEnabled(true);
    }

    private _createProviderRootNodes(): void {
        let providerRootNodes: string[] = [];
        let releaseService = Services.ServiceFactory.getService(Services.ServiceType.ReleaseManagement);

        releaseService.then((service: RMService.IReleaseService) => {
            service.getReleaseDefinitions(RMContracts.ReleaseDefinitionQueryOrder.NameAscending).then((releaseDefinitions: RMContracts.ReleaseDefinition[]) => {
                this._releaseDefinitions = releaseDefinitions;
                releaseDefinitions.forEach((release, index) => {
                    providerRootNodes.push(release.name);
                });
                // set these placeholders into the combo. 
                this._releaseDefinitionCombo.setSource(providerRootNodes);
                this._showDefaultText();
            }, (error) => {
                Diag.logError("Unable to fetch Release Definitions");
            });
        }, (error) => {
            Diag.logError("Unable to get service intance");
        });
    }

    private _createReleaseDefinitionCombo(): Combos.ComboO<Combos.IComboOptions> {
        let comboOptions: Combos.IComboOptions = {

            type: "list",
            // drop button visible.
            mode: "drop",

            enabled: false,
            dropWidth: "dynamic",

            // prevents editing insie the combo.
            allowEdit: false,

            // callback to handle a selection change.  
            indexChanged: (index: number) => this._indexChangedCallback()
        };

        return <Combos.ComboO<Combos.IComboOptions>>Controls.Control.createIn<Combos.IComboOptions>(
            Combos.Combo,
            null,
            comboOptions);
    }

    /**
   * shows default text on experience load (either watermark or current definition name)
   */
    private _showDefaultText(): void {
        if (this._options.initialValue) {
            this._releaseDefinitionCombo.setText(this._currentDefinition.name, false);
        }
        else {
            Utils_UI.Watermark(this._releaseDefinitionCombo.getInput(), { watermarkText: Resources.ReleasePicker_EmptyWatermark });
        }
        Diag.logTracePoint("BuildDefinitionPicker.Loading.Complete");
    }

    private _indexChangedCallback() {
        let selectedReleaseIndex = this._releaseDefinitionCombo.getSelectedIndex();
        let dataSource = this._releaseDefinitionCombo.getBehavior().getDataSource();
        let selectedRel = dataSource.getItem(selectedReleaseIndex);
        this._releaseDefinitions.forEach((release, index) => {
            if (selectedRel === release.name) {
                this._selectedRelease = release;
            }
        });
        if (this._selectedRelease) {
            this._options.onIndexChanged(this._selectedRelease);
        }
    }

    private _$layout: JQuery;
    private _$dropdown: JQuery;
    private _releaseDefinitions: RMContracts.ReleaseDefinition[] = [];
    private _releaseDefinitionCombo: Combos.ComboO<Combos.IComboOptions> = null;
    private _selectedRelease: RMContracts.ReleaseDefinition;
    private _currentDefinition: RMContracts.ReleaseDefinition;
}
