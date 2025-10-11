import { useState } from "react";
import Icon from "../global/Icon";
import Button from "../global/Button";
import Integrations from "./Integrations";

const Settings = () => {
    const [selectedButton, setSelectedButton] = useState("General");

    return (
        <div className="flex h-screen">
            <div className="min-w-50 max-w-50 p-5 space-y-2 border-gray-300 border-r-1">
                <h1 className="font-sans text-xl pb-1">Settings</h1>

                <Button
                    label="General"
                    icon={<Icon name="settings" size={16} color={selectedButton == "General" ? "#2c3cca" : "#100f29"}/>}
                    onClick={() => setSelectedButton("General")}
                    isSelected={selectedButton == "General"}
                />

                <Button
                    label="Integrations"
                    icon={<Icon name="integrations" size={16} color={selectedButton == "Integrations" ? "#2c3cca" : "#100f29"}/>}
                    onClick={() => setSelectedButton("Integrations")}
                    isSelected={selectedButton == "Integrations"}
                />

                <Button
                    label="Account"
                    icon={<Icon name="account" size={16} color={selectedButton == "Account" ? "#2c3cca" : "#100f29"} />}
                    onClick={() => setSelectedButton("Account")}
                    isSelected={selectedButton == "Account"}
                />

            </div>
            <div className="w-full p-5 space-y-2 font-sans">
                {selectedButton === "Integrations" && <Integrations />}
                
            </div>
        </div>
    )
}

export default Settings