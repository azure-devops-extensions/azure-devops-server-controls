import * as Resources from "DistributedTask/Scripts/Resources/TFS.Resources.DistributedTask";

import { NameValuePair } from "DistributedTask/Scripts/Extensions/Common/NameValuePair";

// Using numbers instead of names as headers to fix the compat issue caused due to Object to Array change in FlatViewTable Headers
export const NameColumnKey: string = "0";
export const ValueColumnKey: string = "1";
export const InfoColumnKey: string = "2";

export const AllowedAppTypes: string[] = ["node", "python_bottle", "python_django", "python_flask", "Go", "java_springboot"];

export const AppType = {
    node: "node",
    python_Bottle: "python_Bottle",
    python_Django: "python_Django",
    python_Flask: "python_Flask",
    Go: "Go",
    Java_SpringBoot: "java_springboot"
}

export const AppTypeColumnKey = "appType";

export const NodeParameters: NameValuePair[] = [
    {
        name: "Handler",
        value: "iisnode",
        info: Resources.Handler
    },
    {
        name: "NodeStartFile",
        value: "server.js",
        info: Resources.NodeStartFile
    }
]

export const PythonWithBottleParameters: NameValuePair[] = [
    {
        name: "WSGI_HANDLER",
        value: "app.wsgi_app()",
        info: Resources.WSGIHandlerBottle

    },
    {
        name: "PYTHON_PATH",
        value: "D:\\home\\python353x86\\python.exe",
        info: Resources.PythonPath
    },
    {
        name: "PYTHON_WFASTCGI_PATH",
        value: "D:\\home\\python353x86\\wfastcgi.py",
        info: Resources.PythonWFASTCGIPath
    }
]

export const PythonWithDjangoParameters: NameValuePair[] = [
    {
        name: "WSGI_HANDLER",
        value: "django.core.wsgi.get_wsgi_application()",
        info: Resources.WSGIHandlerDjango
    },
    {
        name: "PYTHON_PATH",
        value: "D:\\home\\python353x86\\python.exe",
        info: Resources.PythonPath
    },
    {
        name: "DJANGO_SETTINGS_MODULE",
        value: "",
        info: Resources.DjangoSettingsModule
    },
    {
        name: "PYTHON_WFASTCGI_PATH",
        value: "D:\\home\\python353x86\\wfastcgi.py",
        info: Resources.PythonWFASTCGIPath
    }
]

export const PythonWithFlaskParameters: NameValuePair[] = [
    {
        name: "WSGI_HANDLER",
        value: "main.app",
        info: Resources.WSGIHandlerFlask
    },
    {
        name: "PYTHON_PATH",
        value: "D:\\home\\python353x86\\python.exe",
        info: Resources.PythonPath
    },
    {
        name: "STATIC_FOLDER_PATH",
        value: "static",
        info: Resources.StaticFolderPath
    },
    {
        name: "PYTHON_WFASTCGI_PATH",
        value: "D:\\home\\python353x86\\wfastcgi.py",
        info: Resources.PythonWFASTCGIPath
    }
]

export const GoParameters: NameValuePair[] = [
    {
        name: "GoExeFileName",
        value: "",
        info: Resources.GoExeFileName
    }
]

export const JavaSpringBootParameters: NameValuePair[] = [
    {
        name: "JAR_PATH",
        value: "D:\\home\\site\\wwwroot\\*.jar",
        info: Resources.JarPathOnAppService
    },
    {
        name: "ADDITIONAL_DEPLOYMENT_OPTIONS",
        value: "'-Dserver.port=%HTTP_PLATFORM_PORT%'",
        info: Resources.AdditionalOptionsForDeployment
    }
]
