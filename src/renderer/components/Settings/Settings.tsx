import { useState } from "react";
import Icon from "../global/Icon";
import Button from "../global/Button";
import Integrations from "./Integrations";
import Feedback from "./Feedback";

const Settings = () => {
    const [selectedButton, setSelectedButton] = useState("Integrations");

    return (
        <div className="flex h-screen">
            <div className="min-w-55 max-w-55 border-[#e4e4e7] border-r-1 p-4 space-y-2.5 bg-[#f8f8f8]"> 
                {/* <Button
                    label="Preferences"
                    icon={<Icon name="preferences" size={22} color={selectedButton == "Preferences" ? "#2c3cca" : "#100f29"} strokeWidth={selectedButton == "Preferences" ? 2.2 : 1.9}/>}
                    onClick={() => setSelectedButton("Preferences")}
                    isSelected={selectedButton == "Preferences"}
                /> */}

                <Button
                    label="Integrations"
                    icon={<Icon name="integrations" size={22} color={selectedButton == "Integrations" ? "#2c3cca" : "#100f29"} strokeWidth={selectedButton == "Integrations" ? 2.2 : 1.9}/>}
                    onClick={() => setSelectedButton("Integrations")}
                    isSelected={selectedButton == "Integrations"}
                />

                <Button
                    label="Feedback"
                    icon={<Icon name="feedback" size={22} color={selectedButton == "Feedback" ? "#2c3cca" : "#100f29"} strokeWidth={selectedButton == "Feedback" ? 2.2 : 1.9} />}
                    onClick={() => setSelectedButton("Feedback")}
                    isSelected={selectedButton == "Feedback"}
                />

                {/* <Button
                    label="Account"
                    icon={<Icon name="account" size={22} color={selectedButton == "Account" ? "#2c3cca" : "#100f29"} strokeWidth={selectedButton == "Account" ? 2.2 : 1.9} />}
                    onClick={() => setSelectedButton("Account")}
                    isSelected={selectedButton == "Account"}
                /> */}

            </div>
            <div className="w-full p-4 space-y-2">
                {selectedButton === "Integrations" && <Integrations />}
                {selectedButton === "Feedback" && <Feedback />}
            </div>
        </div>
    )
}

export default Settings