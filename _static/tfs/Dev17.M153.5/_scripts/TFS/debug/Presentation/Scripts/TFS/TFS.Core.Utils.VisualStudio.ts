/// <reference types="jquery" />

export module VSLauncher {

    //FW link for VS install
    var VSInstallFwLink = "https://go.microsoft.com/fwlink/?LinkId=309297";

    function isMsLaunchUriSupported(): boolean {
        var bRet = false;
        try {
            if (getWindowsVersion() >= 6.2) { //msLaunchUri is supported on Win8 or higher only
                if (navigator.msLaunchUri)
                    bRet = true;
            }
        }
        catch (e) { }

        return bRet;
    }

    function getWindowsVersion() {
        var version = -1;
        var regEx = /Windows NT ([0-9]+(\.[0-9]+)*)/;
        if (regEx.exec(navigator.appVersion) !== null)
            version = parseFloat(RegExp.$1);

        return version;
    }

    export function openVSWebLink(vswebUri: string) {
        try {

            if (navigator.platform !== "Win32" && navigator.platform !== "Win64") {
                window.open(VSInstallFwLink);
                return;
            }

            if (isMsLaunchUriSupported()) {
                navigator.msLaunchUri(vswebUri,
                /*onSuccess*/ null,
                    /*onFailure*/ function () { window.open(VSInstallFwLink); });
            }
            else {
                window.location.href = vswebUri;
            }
        }
        catch (e) {
            window.open(VSInstallFwLink);
        }
    }
}

