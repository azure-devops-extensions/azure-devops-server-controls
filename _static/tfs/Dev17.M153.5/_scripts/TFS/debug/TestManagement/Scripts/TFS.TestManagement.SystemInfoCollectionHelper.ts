import Utils_Core = require("VSS/Utils/Core");

import Resources = require("TestManagement/Scripts/Resources/TFS.Resources.TestManagement");
import { DesktopTestRunConstants } from "TestManagement/Scripts/TFS.TestManagement.DesktopTestRunHelper";

export class SystemInformationDataCollection {

    public static timeout: number = 100;  //in ms

    public static getSystemInfo(callBack: IResultCallback, errorCallBack: IErrorCallback) {
        let getSystemInfoCommand = "xtPage-get-systemInfo-v1";
        let getSystemInfoCommandResponse = "xtPage-get-systemInfo-response-v1";
        window.postMessage({
            communicationProtocolVersion: DesktopTestRunConstants.communicationProtocolVersion,
            type: getSystemInfoCommand
        }, "*");


        let delayFunc = Utils_Core.delay(null, this.timeout, () => {
            window.removeEventListener("message", handleGetSystemInfoCommandResponse);
            errorCallBack(Resources.WebXTExntesionInstallRequired);
        });

        function onResponse(): void {
            window.removeEventListener("message", handleGetSystemInfoCommandResponse);
            delayFunc.cancel();
        }

        function handleGetSystemInfoCommandResponse(event: any) {
            if (event.data.type && event.data.type === getSystemInfoCommandResponse) {
                onResponse();
                callBack(event.data.data);
            }
        }

        window.addEventListener("message", handleGetSystemInfoCommandResponse);
    }
}

export class SystemInfoHelper {

    public static getLocalisedSystemInfo(info): any {
        let localisedSystemInfo: any = {};
        if (info && info.content && info.id) {
            localisedSystemInfo.id = info.id;
            let content: any = {};
            let data = $.parseJSON(info.content);

            $.each(data, (parameterName, parameterValues) => {
                let params: any = {};
                $.each(parameterValues, (key, value) => {
                    params[this._getLocalisedKey(key)] = value;
                });
                content[this._getLocalisedKey(parameterName)] = params;
            });

            localisedSystemInfo.content = JSON.stringify(content);
        }
        return localisedSystemInfo;
    }

    public static getSysInfoHtml(info): string {

        let systemInfoHtml: string = "";

        if (info && info.content) {
            let data = $.parseJSON(info.content);
            let containerDiv = $("<div/>");
            let table = $("<table/>");

            $.each(data, (parameterName, parameterValues) => {
                $.each(parameterValues, (key, value) => {
                    let row = $("<tr/>");
                    row.append($("<td/>").attr("style", "border:solid 1px #000000; border-collapse:collapse;padding-left:4px;").text(parameterName + " - " + key));
                    row.append($("<td/>").attr("style", "border:solid 1px #000000; border-collapse:collapse;padding-left:4px;").text(value));
                    table.append(row);
                });

            });

            table.attr("style", "border:solid 1px #000000; border-collapse:collapse; font-family: Segoe UI, Tahoma, Arial, Verdana; font-size:12px");
            containerDiv.append(table);
            systemInfoHtml = containerDiv.html();
        }

        return systemInfoHtml;
    }

    public static _getLocalisedKey(key: string): string {

        switch (key) {
            case "Browser":
                return Resources.Browser;
            case "Name":
                return Resources.Name;
            case "Language":
                return Resources.Language;
            case "Height":
                return Resources.Height;
            case "Width":
                return Resources.Width;
            case "UserAgent":
                return Resources.UserAgent;
            case "OS":
                return Resources.OS;
            case "Memory":
                return Resources.Memory;
            case "Available":
                return Resources.Available;
            case "Capacity":
                return Resources.Capacity;
            case "Display":
                return Resources.Display;
            case "PixelsPerInchXaxis":
                return Resources.PixelsPerInchXaxis;
            case "PixelsPerInchYaxis":
                return Resources.PixelsPerInchYaxis;
            case "DevicePixelRatio":
                return Resources.DevicePixelRatio;
            case "NumberOfProcessors":
                return Resources.NumberOfProcessors;
            case "ProcessorModel":
                return Resources.ProcessorModel;
            case "Architecture":
                return Resources.Architecture;
        }

        return "";
    }
}