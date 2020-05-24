
export enum MobileOperatingSystem {
    iOS,
    Android,
    WindowsPhone,
    Other
}

export function getMobileOperatingSystem(): MobileOperatingSystem {
    var userAgent = navigator.userAgent;

    if (!userAgent) {
        return MobileOperatingSystem.Other;
    }

    // Windows Phone must come first because its UA also contains "Android"
    if (/windows phone/i.test(userAgent)) {
        return MobileOperatingSystem.WindowsPhone;
    }

    if (/android/i.test(userAgent)) {
        return MobileOperatingSystem.Android;
    }

    if (/iPhone|iPod/.test(userAgent)) {
        return MobileOperatingSystem.iOS;
    }

    return MobileOperatingSystem.Other;
}


/**
* Determines if the mobile OS supports the left to right and right to left swipe for
* navigating back and forward in history
*/
export function isNavigationSwipeSupported() {
    var mobileOperatingSystem = getMobileOperatingSystem();

    return mobileOperatingSystem === MobileOperatingSystem.WindowsPhone || mobileOperatingSystem === MobileOperatingSystem.iOS;
}
