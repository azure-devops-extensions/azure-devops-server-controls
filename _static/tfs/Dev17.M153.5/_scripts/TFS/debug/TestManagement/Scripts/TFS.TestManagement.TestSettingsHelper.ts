
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Resources = require("TestManagement/Scripts/Resources/TFS.Resources.TestManagement");
import TCM_Client = require("TFS/TestManagement/RestClient");
import TCMContracts = require("TFS/TestManagement/Contracts");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");

export class TestSettingsXmlHelper
{
    /**
     * Return the test settings Xml based on data collectors passed by user
     * @param dataCollectors: array of data collectors
     */
    public static getTestSettingsXml(dataCollectors: string[]): string {
        let output: string = Utils_String.empty;
        let testSettingsXml: XMLDocument = $.parseXML(TestSettingsXmlHelper._testSettingsXml);
        this._addDataCollectorsXml(dataCollectors, testSettingsXml);
        return Utils_Core.domToXml(testSettingsXml);
    }

    private static _addDataCollectorsXml(dataCollectors: string[], xmlDocument: XMLDocument) {
        let $dataCollectors = $(xmlDocument).find(TestSettingsXmlHelper._dataCollectorsNodeName);

        $.each(dataCollectors, (index: number, dc: string) => {
            let dcXml: string = this._getDataCollectorXmlString(dc);
            if (dcXml !== Utils_String.empty) {
                let xml: XMLDocument = $.parseXML(dcXml);
                let $element = $(xml).find(this._dataCollectorNodeName);
                $dataCollectors.append($element);
            }
        });
    }

    private static _getDataCollectorXmlString(dataCollector: string): string {

        let dcXml: string = Utils_String.empty;
        switch (dataCollector) {

            case Resources.DataCollectorImageActionLogText:
                let imageActionLogHelper = new ImageActionLogDataCollectorHelper();
                dcXml = imageActionLogHelper.getDataCollectorXml();
                break;

            case Resources.DataCollectorSystemInformationText:
                let systemInfoHelper = new SystemInfoDataCollectorHelper();
                dcXml = systemInfoHelper.getDataCollectorXml();
                break;

            case Resources.DataCollectorEventLogText:
                let eventLogHelper = new EventLogDataCollectorHelper();
                dcXml = eventLogHelper.getDataCollectorXml();
                break;

            case Resources.DataCollectorScreenRecorderText:
                let screenRecorderHelper = new ScreenRecordingDataCollectorHelper();
                dcXml = screenRecorderHelper.getDataCollectorXml();
                break;
        }
        return dcXml; 
    }


    private static _dataCollectorsNodeName: string = "DataCollectors";
    private static _dataCollectorNodeName: string = "DataCollector";
    private static _testSettingsNodeName: string = "TestSettings";
    private static _testSettingsXml: string = "<TestSettings xmlns=\"http://microsoft.com/schemas/VisualStudio/TeamTest/2010\"><Execution xmlns=\"http://microsoft.com/schemas/VisualStudio/TeamTest/2010\"><TestTypeSpecific /><AgentRule name=\"Local\"><SelectionCriteria><AgentProperty name=\"__Test Environment\" value=\"__Placeholder_TestEnvironmentName\" /><AgentProperty name=\"__Machine Role\" value=\"Local\" /></SelectionCriteria><DataCollectors></DataCollectors></AgentRule></Execution></TestSettings>";
}

export class TestSettingsManager {

    /**
     * Create the testSetting object in TCM database
     * @param areaPath: AreaPth for testSettings
     * @param dataCollectors : DataCollectors enabled in test settings
     * @param name : Name of the setting
     */
    public createTestSettings(areaPath: string, dataCollectors: string[], name: string) {
        let testSettings: TCMContracts.TestSettings = this._getTestSettingsObject(areaPath, dataCollectors, name);
        let project: string = TFS_Host_TfsContext.TfsContext.getDefault().navigation.project;
        let tcmClient = TCM_Client.getClient();
        return tcmClient.createTestSettings(testSettings, project);
    }

    private _getTestSettingsObject(areaPath: string, dataCollectors: string[], name: string): TCMContracts.TestSettings{
        let tetestSettingsString = TestSettingsXmlHelper.getTestSettingsXml(dataCollectors);
        let testRunSettings = {
            areaPath: areaPath,
            description: "Setting created through web access run with options",
            isPublic: false,
            machineRoles: "<roles><role name=\"Local\" execution= \"true\"/></roles>",
            testSettingsContent: tetestSettingsString,
            testSettingsName: name,
            testSettingsId: -1
        };
        return testRunSettings;
    }
}

export class DataCollectorXmlHelper {

    // Uri Associated with data collectors
    public uri: string;

    // Assemblies required for data collector
    public assemblyQualifiedName: string;

    // Friendly name of data collector
    public friendlyName: string;

    constructor(uri: string, qualifiedName: string, friendlyName: string) {
        this.uri = uri;
        this.assemblyQualifiedName = qualifiedName;
        this.friendlyName = friendlyName;
    }

    /**
     * Construct the data collector xml node based on parameters
     */
    public getDataCollectorXml() {
        let dataCollectorXml = Utils_String.format(this._dataCollectorXml, this.uri, this.assemblyQualifiedName, this.friendlyName);
        return dataCollectorXml;
    }

    private _dataCollectorXml: string = "<DataCollector uri=\"{0}\" assemblyQualifiedName=\"{1}\" friendlyName=\"{2}\" />";
}

export class SystemInfoDataCollectorHelper extends DataCollectorXmlHelper {

    constructor() {
        super(SystemInfoDataCollectorHelper._uri, SystemInfoDataCollectorHelper._assemblyQualifiedName, SystemInfoDataCollectorHelper._friendlyName);
    }

    private static _uri = "datacollector://microsoft/SystemInfo/1.0";
    private static _assemblyQualifiedName = "Microsoft.VisualStudio.TestTools.DataCollection.SystemInfo.SystemInfoDataCollector, Microsoft.VisualStudio.TestTools.DataCollection.SystemInfo, Culture=neutral, PublicKeyToken=b03f5f7f11d50a3a";
    private static _friendlyName = "System Information";
}

export class ImageActionLogDataCollectorHelper extends DataCollectorXmlHelper {

    constructor() {
        super(ImageActionLogDataCollectorHelper._uri, ImageActionLogDataCollectorHelper._assemblyQualifiedName, ImageActionLogDataCollectorHelper._friendlyName);
    }

    private static _uri = "datacollector://microsoft/ActionLog/1.0";
    private static _assemblyQualifiedName = "Microsoft.VisualStudio.TestTools.ManualTest.ActionLog.ActionLogPlugin, Microsoft.VisualStudio.TestTools.ManualTest.ActionLog, Culture=neutral, PublicKeyToken=b03f5f7f11d50a3a";
    private static _friendlyName = "Action Log";
}

export class EventLogDataCollectorHelper extends DataCollectorXmlHelper {

    constructor() {
        super(EventLogDataCollectorHelper._uri, EventLogDataCollectorHelper._assemblyQualifiedName, EventLogDataCollectorHelper._friendlyName);
    }

    private static _uri = "datacollector://microsoft/EventLog/1.0";
    private static _assemblyQualifiedName = "Microsoft.VisualStudio.TestTools.DataCollection.EventLog.EventLogDataCollector, Microsoft.VisualStudio.TestTools.DataCollection.EventLog, Culture=neutral, PublicKeyToken=b03f5f7f11d50a3a";
    private static _friendlyName = "Event Log";
}

export class ScreenRecordingDataCollectorHelper extends DataCollectorXmlHelper {

    constructor() {
        super(ScreenRecordingDataCollectorHelper._uri, ScreenRecordingDataCollectorHelper._assemblyQualifiedName, ScreenRecordingDataCollectorHelper._friendlyName);
    }

    private static _uri = "datacollector://microsoft/VideoRecorder/1.0";
    private static _assemblyQualifiedName = "Microsoft.VisualStudio.TestTools.DataCollection.VideoRecorder.VideoRecorderDataCollector, Microsoft.VisualStudio.TestTools.DataCollection.VideoRecorder, Culture=neutral, PublicKeyToken=b03f5f7f11d50a3a";
    private static _friendlyName = "Screen and Voice Recorder";
}

