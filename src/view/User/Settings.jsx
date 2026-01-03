import React from "react";
import DeleteAccount from "./DeleteAccount";
import AccountManagement from "./AccountManagement";
import UnitsManagement from "./UnitsManagement";
import RoutePreferencesManagement from "./RoutePreferencesManagement";

export default function Settings() {
    return (
        <div>
            <h1 className="page-title" style={{textAlign: "center", paddingTop: "1rem"}}>Settings</h1>
            <AccountManagement />
            <hr className="divider" role="separator" aria-orientation="horizontal" />
            <UnitsManagement />
            <hr className="divider" role="separator" aria-orientation="horizontal" />
            <RoutePreferencesManagement />
            <hr className="divider" role="separator" aria-orientation="horizontal" />
            <DeleteAccount />
        </div>
    );
}